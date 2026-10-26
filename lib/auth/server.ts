import 'server-only';

import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import { ApiError, authFailureDiagnostics } from '@/lib/api/errors';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/database.types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { selectedWorkspaceCookie } from '@/lib/workspace-data';

const challengeCookie = 'budgetly-otp-challenge';
const invalidCode = () =>
  new ApiError(401, 'INVALID_OTP', 'The code is invalid or expired. Request a new code.');

export async function readAuthBody(request: NextRequest, fields: string[]) {
  const origin = request.headers.get('origin');
  const appOrigin = process.env.APP_ORIGIN;
  if (!appOrigin)
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured.');
  if (!origin || origin !== appOrigin) {
    throw new ApiError(403, 'FORBIDDEN', 'Use Budgetly to submit this request.');
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a JSON request.');
  }
  const text = await request.text();
  if (text.length > 2048) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'Request is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid JSON request.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid authentication request.');
  }
  const entries = Object.entries(body);
  if (
    entries.length !== fields.length ||
    entries.some(([key, value]) => !fields.includes(key) || typeof value !== 'string')
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid authentication fields.');
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
  }
  return email;
}

async function gate(
  request: NextRequest,
  email: string,
  operation: 'request' | 'verify' | 'complete',
  challenge: string,
) {
  const { url } = getSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  const hashSecret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret?.startsWith('sb_secret_') || !hashSecret || hashSecret.length < 32) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured.');
  }
  // Only Vercel's overwritten IP header is trusted in deployment. Local development shares a bucket.
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
      : 'local';
  if (!ip)
    throw new ApiError(
      503,
      'AUTH_UNAVAILABLE',
      'Unable to validate the request source.',
      undefined,
      authFailureDiagnostics('request_source', operation),
    );
  const hash = (value: string) => createHmac('sha256', hashSecret).update(value).digest('hex');
  const admin = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error, status } = await admin.rpc('consume_otp_limit', {
    operation,
    email_hash: hash(email),
    ip_hash: hash(ip),
    challenge_id: challenge,
  });
  if (
    error ||
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.allowed !== 'boolean'
  ) {
    throw new ApiError(
      503,
      'AUTH_UNAVAILABLE',
      'Authentication is temporarily unavailable.',
      undefined,
      authFailureDiagnostics(
        error ? 'otp_limiter' : 'otp_limiter_response',
        operation,
        error?.code,
        status,
      ),
    );
  }
  if (!data.allowed) {
    if (operation === 'verify') throw invalidCode();
    throw new ApiError(
      429,
      'RATE_LIMITED',
      'Please wait before requesting another code.',
      typeof data.retry_after === 'number' ? data.retry_after : 60,
    );
  }
}

export async function requestOtp(request: NextRequest) {
  const body = await readAuthBody(request, ['email']);
  const email = normalizeEmail(body.email);
  const challenge = randomUUID();
  await gate(request, email, 'request', challenge);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    if (error.status === 429)
      throw new ApiError(429, 'RATE_LIMITED', 'Please wait before requesting another code.', 60);
    throw new ApiError(
      503,
      'AUTH_UNAVAILABLE',
      'Unable to send a code. Please try again later.',
      undefined,
      authFailureDiagnostics('otp_send', 'request', error.code, error.status),
    );
  }
  const store = await cookies();
  store.set(challengeCookie, challenge, {
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 300,
  });
}

export async function verifyOtp(request: NextRequest) {
  const body = await readAuthBody(request, ['email', 'otp']);
  const email = normalizeEmail(body.email);
  if (!/^\d{6}$/.test(body.otp)) throw invalidCode();
  const store = await cookies();
  const challenge = store.get(challengeCookie)?.value;
  if (!challenge || !/^[0-9a-f-]{36}$/.test(challenge)) throw invalidCode();
  await gate(request, email, 'verify', challenge);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: body.otp, type: 'email' });
  if (error) {
    if (error.status && error.status >= 500)
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
    throw invalidCode();
  }
  if (!data.user || !data.session) throw invalidCode();
  try {
    await gate(request, email, 'complete', challenge);
    const { data: workspaceId, error: provisionError } = await supabase.rpc(
      'ensure_household_workspace',
    );
    if (provisionError) {
      console.error('Budgetly account provisioning failed', { code: provisionError.code });
      if (provisionError.code === '42501') {
        throw new ApiError(
          403,
          'ACCOUNT_UNAVAILABLE',
          'An active Household membership is required to open this account.',
        );
      }
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Account setup is temporarily unavailable.');
    }
    if (
      !workspaceId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)
    ) {
      throw new ApiError(
        503,
        'DATABASE_UNAVAILABLE',
        'Account setup returned an invalid workspace.',
      );
    }
    store.set(selectedWorkspaceCookie, workspaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (error) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError)
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Unable to close the session. Please retry.');
    throw error;
  }
  store.set(challengeCookie, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
  });
}

export async function logout(request: NextRequest) {
  await readAuthBody(request, []);
  const supabase = await createServerSupabaseClient();
  const { data, error: sessionError } = await supabase.auth.getUser();
  if (sessionError && ![400, 401, 403, 422].includes(sessionError.status ?? 0)) {
    throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
  }
  if (!data.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Unable to sign out. Please try again.');
  (await cookies()).set(selectedWorkspaceCookie, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

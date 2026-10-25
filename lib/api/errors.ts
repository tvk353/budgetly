import 'server-only';

import { NextResponse } from 'next/server';

import { SupabaseConfigurationError } from '@/lib/supabase/config';

export type AuthFailureDiagnostics = {
  stage: 'request_source' | 'otp_limiter' | 'otp_limiter_response' | 'otp_send';
  operation: 'request' | 'verify' | 'complete';
  provider_code?: string;
  provider_status?: number;
};

const diagnosticProviderCodes = new Set([
  'PGRST202',
  'PGRST301',
  '42501',
  '42P01',
  '42883',
  'email_address_not_authorized',
  'email_address_invalid',
  'email_provider_disabled',
  'signup_disabled',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'unexpected_failure',
  'request_timeout',
]);

export function authFailureDiagnostics(
  stage: AuthFailureDiagnostics['stage'],
  operation: AuthFailureDiagnostics['operation'],
  code?: string,
  status?: number,
): AuthFailureDiagnostics {
  return {
    stage,
    operation,
    ...(code ? { provider_code: diagnosticProviderCodes.has(code) ? code : 'unclassified' } : {}),
    ...(typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? { provider_status: status }
      : {}),
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
    public readonly diagnostics?: AuthFailureDiagnostics,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown) {
  const requestId = crypto.randomUUID();
  const failure =
    error instanceof ApiError
      ? error
      : error instanceof SupabaseConfigurationError
        ? new ApiError(503, 'BACKEND_NOT_CONFIGURED', error.message)
        : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');

  if (failure.status >= 500) {
    // Do not log provider error bodies, tokens, SQL, or request cookies.
    console.error('Budgetly API failure', {
      request_id: requestId,
      code: failure.code,
      ...failure.diagnostics,
    });
  }

  return NextResponse.json(
    { error: { code: failure.code, message: failure.message, request_id: requestId } },
    {
      status: failure.status,
      headers: {
        'Cache-Control': 'private, no-store',
        ...(failure.retryAfter ? { 'Retry-After': String(failure.retryAfter) } : {}),
      },
    },
  );
}

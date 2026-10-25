// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout, requestOtp, verifyOtp } from '@/lib/auth/server';
import { POST } from '@/app/api/v1/auth/otp/request/route';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  gate: vi.fn(),
  request: vi.fn(),
  verify: vi.fn(),
  provision: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocks.gate }) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      signInWithOtp: mocks.request,
      verifyOtp: mocks.verify,
      signOut: mocks.signOut,
      getUser: mocks.getUser,
    },
    rpc: mocks.provision,
  }),
}));
const challenge = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function request(body: unknown, origin = 'http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  vi.stubEnv('AUTH_RATE_LIMIT_SECRET', 'a'.repeat(32));
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.gate.mockResolvedValue({ data: { allowed: true }, error: null });
  mocks.request.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ data: { user: { id: 'verified' }, session: {} }, error: null });
  mocks.provision.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified' } }, error: null });
  mocks.get.mockReturnValue({ value: challenge });
});
afterEach(() => vi.unstubAllEnvs());

describe('server OTP boundaries', () => {
  it.each([
    ['PGRST202', 404, 'PGRST202'],
    ['42501', 403, '42501'],
    ['private-provider-detail@example.test', 500, 'unclassified'],
  ])(
    'logs a failed limiter with the response request ID and safe code %s',
    async (code, status, safeCode) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        mocks.gate.mockResolvedValue({
          data: null,
          status,
          error: { code, message: 'secret-provider-body', details: 'secret-sql-details' },
        });
        const response = await POST(request({ email: 'private-person@example.test' }));
        const body = await response.json();
        expect(response.status).toBe(503);
        expect(body.error.code).toBe('AUTH_UNAVAILABLE');
        expect(log).toHaveBeenCalledExactlyOnceWith('Budgetly API failure', {
          request_id: body.error.request_id,
          code: 'AUTH_UNAVAILABLE',
          stage: 'otp_limiter',
          operation: 'request',
          provider_code: safeCode,
          provider_status: status,
        });
        const output = JSON.stringify([body, log.mock.calls]);
        for (const sensitive of [
          'private-person',
          'private-provider-detail',
          'secret-provider-body',
          'secret-sql-details',
          'sb_secret_test',
        ]) {
          expect(output).not.toContain(sensitive);
        }
        expect(body.error).not.toHaveProperty('stage');
        expect(body.error).not.toHaveProperty('provider_code');
        expect(mocks.request).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    },
  );
  it.each([
    ['source', 'request_source'],
    ['shape', 'otp_limiter_response'],
    ['send', 'otp_send'],
  ])('distinguishes %s failures in request-correlated logs', async (failure, stage) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      if (failure === 'source') vi.stubEnv('VERCEL', '1');
      if (failure === 'shape')
        mocks.gate.mockResolvedValue({ data: { allowed: 'true' }, error: null, status: 200 });
      if (failure === 'send')
        mocks.request.mockResolvedValue({
          error: {
            code: 'email_address_not_authorized',
            status: 403,
            message: 'secret-smtp-detail',
          },
        });
      const response = await POST(request({ email: 'private-person@example.test' }));
      const body = await response.json();
      expect(response.status).toBe(503);
      expect(log).toHaveBeenCalledExactlyOnceWith(
        'Budgetly API failure',
        expect.objectContaining({
          request_id: body.error.request_id,
          code: 'AUTH_UNAVAILABLE',
          stage,
          operation: 'request',
        }),
      );
      if (failure === 'send') {
        expect(log.mock.calls[0][1]).toMatchObject({
          provider_code: 'email_address_not_authorized',
          provider_status: 403,
        });
      } else {
        expect(mocks.request).not.toHaveBeenCalled();
      }
      expect(JSON.stringify([body, log.mock.calls])).not.toMatch(
        /private-person|secret-smtp-detail/,
      );
      expect(mocks.set).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  const productionOrigin = 'https://budgetly-eta-nine.vercel.app';
  function productionRequest(origin: string | undefined) {
    const headers = new Headers({
      'content-type': 'application/json',
      host: 'internal-proxy.invalid',
      'x-forwarded-host': 'budgetly-eta-nine.vercel.app',
      'x-forwarded-proto': 'https',
      'x-vercel-forwarded-for': '192.0.2.1',
    });
    if (origin !== undefined) headers.set('origin', origin);
    return new NextRequest('http://internal-proxy.invalid/api/v1/auth/otp/request', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'person@example.test' }),
    });
  }
  it('accepts the configured HTTPS origin behind Vercel without trusting the internal host', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('APP_ORIGIN', productionOrigin);
    await requestOtp(productionRequest(productionOrigin));
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.gate).toHaveBeenCalledWith(
      'consume_otp_limit',
      expect.objectContaining({
        ip_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });
  it.each([
    ['missing Origin', undefined, productionOrigin],
    ['opaque Origin', 'null', productionOrigin],
    ['foreign Origin', 'https://untrusted.example', productionOrigin],
    ['deployment alias Origin', 'https://budgetly-preview.vercel.app', productionOrigin],
    ['request URL used as Origin', `${productionOrigin}/api/v1/auth/otp/request`, productionOrigin],
    ['trailing slash in APP_ORIGIN', productionOrigin, `${productionOrigin}/`],
    ['development APP_ORIGIN', productionOrigin, 'http://127.0.0.1:3000'],
  ])(
    'rejects %s even when forwarded host matches the trusted domain',
    async (_, origin, appOrigin) => {
      vi.stubEnv('VERCEL', '1');
      vi.stubEnv('APP_ORIGIN', appOrigin);
      await expect(requestOtp(productionRequest(origin))).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Use Budgetly to submit this request.',
      });
      expect(mocks.gate).not.toHaveBeenCalled();
      expect(mocks.request).not.toHaveBeenCalled();
      expect(mocks.set).not.toHaveBeenCalled();
    },
  );
  it('reports missing Vercel client IP separately after a valid origin check', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('APP_ORIGIN', productionOrigin);
    const incoming = productionRequest(productionOrigin);
    incoming.headers.delete('x-vercel-forwarded-for');
    await expect(requestOtp(incoming)).rejects.toMatchObject({
      status: 503,
      code: 'AUTH_UNAVAILABLE',
      message: 'Unable to validate the request source.',
    });
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([
    ['APP_ORIGIN', ''],
    ['SUPABASE_SECRET_KEY', ''],
    ['SUPABASE_SECRET_KEY', 'eyJlegacy.jwt.key'],
    ['AUTH_RATE_LIMIT_SECRET', ''],
    ['AUTH_RATE_LIMIT_SECRET', 'a'.repeat(31)],
  ])('rejects missing or invalid %s before contacting the backend', async (name, value) => {
    vi.stubEnv(name, value);
    await expect(requestOtp(request({ email: 'person@example.test' }))).rejects.toMatchObject({
      status: 503,
      code: 'AUTH_NOT_CONFIGURED',
    });
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('distinguishes a limiter service failure from missing configuration', async () => {
    mocks.gate.mockResolvedValue({ data: null, error: { message: 'provider detail' } });
    await expect(requestOtp(request({ email: 'person@example.test' }))).rejects.toMatchObject({
      status: 503,
      code: 'AUTH_UNAVAILABLE',
      message: 'Authentication is temporarily unavailable.',
    });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('distinguishes an Auth service failure from missing configuration', async () => {
    mocks.request.mockResolvedValue({ error: { status: 503, message: 'provider detail' } });
    await expect(requestOtp(request({ email: 'person@example.test' }))).rejects.toMatchObject({
      status: 503,
      code: 'AUTH_UNAVAILABLE',
      message: 'Unable to send a code. Please try again later.',
    });
    expect(mocks.gate).toHaveBeenCalledOnce();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('returns 401 for unauthenticated logout', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(logout(request({}))).rejects.toMatchObject({ status: 401 });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('normalizes email, consumes a durable limit, and sets a private challenge cookie', async () => {
    await requestOtp(request({ email: 'Person@Example.test' }));
    expect(mocks.request).toHaveBeenCalledWith({
      email: 'person@example.test',
      options: { shouldCreateUser: true },
    });
    expect(mocks.gate).toHaveBeenCalledWith(
      'consume_otp_limit',
      expect.objectContaining({
        operation: 'request',
        email_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(mocks.set).toHaveBeenCalledWith(
      'budgetly-otp-challenge',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', maxAge: 300 }),
    );
  });
  it('enforces cooldown and returns a retry time before contacting Auth', async () => {
    mocks.gate.mockResolvedValue({ data: { allowed: false, retry_after: 45 }, error: null });
    await expect(requestOtp(request({ email: 'person@example.test' }))).rejects.toMatchObject({
      status: 429,
      retryAfter: 45,
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('establishes a real provider session, consumes the challenge, and provisions only the authenticated account', async () => {
    await verifyOtp(request({ email: 'person@example.test', otp: '123456' }));
    expect(mocks.set).toHaveBeenCalledWith(
      'budgetly-workspace',
      '',
      expect.objectContaining({ httpOnly: true, path: '/', maxAge: 0 }),
    );
    expect(mocks.verify).toHaveBeenCalledWith({
      email: 'person@example.test',
      token: '123456',
      type: 'email',
    });
    expect(mocks.provision).toHaveBeenCalledWith('ensure_personal_workspace');
    expect(mocks.gate).toHaveBeenLastCalledWith(
      'consume_otp_limit',
      expect.objectContaining({ operation: 'complete' }),
    );
  });
  it.each(['otp_expired', 'otp_disabled', 'invalid_credentials'])(
    'does not expose provider verification details: %s',
    async (code) => {
      mocks.verify.mockResolvedValue({
        data: { user: null, session: null },
        error: { status: 403, code, message: 'provider detail' },
      });
      await expect(
        verifyOtp(request({ email: 'person@example.test', otp: '123456' })),
      ).rejects.toMatchObject({ status: 401, code: 'INVALID_OTP' });
      expect(mocks.provision).not.toHaveBeenCalled();
    },
  );
  it('rejects exhausted attempts without contacting Supabase verification', async () => {
    mocks.gate.mockResolvedValue({ data: { allowed: false }, error: null });
    await expect(
      verifyOtp(request({ email: 'person@example.test', otp: '123456' })),
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('does not accept an OTP without the browser-bound challenge', async () => {
    mocks.get.mockReturnValue(undefined);
    await expect(
      verifyOtp(request({ email: 'person@example.test', otp: '123456' })),
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('revokes sessions if application provisioning fails', async () => {
    mocks.provision.mockResolvedValue({ error: { code: '42501', message: 'account deleted' } });
    await expect(
      verifyOtp(request({ email: 'person@example.test', otp: '123456' })),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('requires same-origin JSON and rejects caller-supplied user identity', async () => {
    await expect(
      requestOtp(request({ email: 'person@example.test' }, 'https://evil.test')),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      verifyOtp(request({ email: 'person@example.test', otp: '123456', user_id: 'attacker' })),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('uses local sign-out and reports provider failures explicitly', async () => {
    await logout(request({}));
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.set).toHaveBeenCalledWith(
      'budgetly-workspace',
      '',
      expect.objectContaining({ httpOnly: true, path: '/', maxAge: 0 }),
    );
    mocks.set.mockClear();
    mocks.signOut.mockResolvedValue({ error: { status: 503 } });
    await expect(logout(request({}))).rejects.toMatchObject({ status: 503 });
    expect(mocks.set).not.toHaveBeenCalled();
  });
});

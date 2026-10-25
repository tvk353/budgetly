// @vitest-environment node
import type { CookieOptions } from '@supabase/ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('server-only', () => ({}));
const store = vi.hoisted(() => ({
  getAll: vi.fn<() => { name: string; value: string }[]>(),
  set: vi.fn<(name: string, value: string, options: CookieOptions) => void>(),
}));
vi.mock('next/headers', () => ({ cookies: async () => store }));

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'local@example.test',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-25T00:00:00Z',
};

function accessToken(expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt })).toString(
    'base64url',
  );
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.test`;
}

function sessionCookie(expiresAt: number) {
  const session = {
    access_token: accessToken(expiresAt),
    refresh_token: 'local-test-refresh',
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
  return {
    name: 'sb-127-auth-token',
    value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
  };
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_local_test');
  store.getAll.mockReturnValue([]);
  store.set.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('SSR session cookies using the real Supabase SDK', () => {
  it('does not invent a session when cookies are missing', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.auth.getUser();
    expect(data.user).toBeNull();
    expect(error?.name).toBe('AuthSessionMissingError');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates an existing session with Auth instead of trusting the cookie user', async () => {
    store.getAll.mockReturnValue([sessionCookie(Math.floor(Date.now() / 1000) + 3600)]);
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const client = await createServerSupabaseClient();
    expect((await client.auth.getUser()).data.user?.id).toBe(user.id);
    expect(fetch.mock.calls[0][0]).toContain('/auth/v1/user');
  });

  it('refreshes an expired session and writes the rotated tokens to response cookies', async () => {
    store.getAll.mockReturnValue([sessionCookie(1)]);
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const refreshed = {
      access_token: accessToken(expiresAt),
      refresh_token: 'rotated-local-test-refresh',
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: 'bearer',
      user,
    };
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const body = String(input).includes('/token?') ? refreshed : user;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetch);
    const client = await createServerSupabaseClient();
    expect((await client.auth.getUser()).data.user?.id).toBe(user.id);
    expect(fetch.mock.calls.some(([url]) => String(url).includes('grant_type=refresh_token'))).toBe(
      true,
    );
    expect(store.set).toHaveBeenCalledWith(
      'sb-127-auth-token',
      expect.any(String),
      expect.objectContaining({ path: '/', sameSite: 'lax', secure: false, httpOnly: true }),
    );
    const written = store.set.mock.calls.find(([name]) => name === 'sb-127-auth-token')?.[1];
    expect(written).toBeDefined();
    const decoded = Buffer.from(written!.replace(/^base64-/, ''), 'base64url').toString();
    expect(JSON.parse(decoded).refresh_token).toBe('rotated-local-test-refresh');
  });

  it('rejects invalid tokens and does not reuse the cookie identity', async () => {
    store.getAll.mockReturnValue([sessionCookie(Math.floor(Date.now() / 1000) + 3600)]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'bad_jwt', msg: 'Invalid JWT' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const client = await createServerSupabaseClient();
    const { data, error } = await client.auth.getUser();
    expect(data.user).toBeNull();
    expect(error?.status).toBe(401);
  });

  it('does not swallow cookie-write failures', async () => {
    store.getAll.mockReturnValue([sessionCookie(Math.floor(Date.now() / 1000) + 3600)]);
    store.set.mockImplementation(() => {
      throw new Error('Cookie writes unavailable');
    });
    const client = await createServerSupabaseClient();
    await expect(client.auth.signOut({ scope: 'local' })).rejects.toThrow(
      'Cookie writes unavailable',
    );
  });

  it('clears an expired session when its refresh token has been revoked', async () => {
    store.getAll.mockReturnValue([sessionCookie(1)]);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ code: 'refresh_token_not_found', msg: 'Invalid refresh token' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
    );
    const client = await createServerSupabaseClient();
    const { data, error } = await client.auth.getUser();
    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
    expect(store.set).toHaveBeenCalledWith(
      'sb-127-auth-token',
      '',
      expect.objectContaining({ maxAge: 0 }),
    );
  });
});

// @vitest-environment node
import { AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { refreshSession } from '@/lib/supabase/proxy';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ user: vi.fn(), setAll: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: typeof mocks.setAll } },
  ) => {
    mocks.setAll = options.cookies.setAll;
    return { auth: { getUser: mocks.user } };
  },
}));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  mocks.user.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('redirects anonymous pages instead of granting access', async () => {
  mocks.user.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
  const response = await refreshSession(new NextRequest('http://127.0.0.1:3000/workspaces'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe('http://127.0.0.1:3000/');
  expect(response.headers.get('cache-control')).toContain('no-store');
});
it('propagates refreshed cookies into the request and outgoing response', async () => {
  const request = new NextRequest('http://127.0.0.1:3000/workspaces');
  mocks.user.mockImplementation(async () => {
    mocks.setAll([{ name: 'session', value: 'rotated', options: { httpOnly: true, path: '/' } }], {
      'Cache-Control': 'private, no-store',
      Pragma: 'no-cache',
    });
    return { data: { user: { id: 'validated' } }, error: null };
  });
  const response = await refreshSession(request);
  expect(request.cookies.get('session')?.value).toBe('rotated');
  expect(response.cookies.get('session')?.value).toBe('rotated');
  expect(response.headers.get('pragma')).toBe('no-cache');
});
it('keeps cookie deletions when redirecting an expired session', async () => {
  mocks.user.mockImplementation(async () => {
    mocks.setAll([{ name: 'session', value: '', options: { path: '/', maxAge: 0 } }], {});
    return { data: { user: null }, error: new AuthSessionMissingError() };
  });
  const response = await refreshSession(new NextRequest('http://127.0.0.1:3000/workspaces'));
  expect(response.status).toBe(307);
  expect(response.cookies.get('session')?.value).toBe('');
});
it('reports an Auth outage instead of redirecting as if the user had signed out', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.user.mockResolvedValue({
    data: { user: null },
    error: new AuthRetryableFetchError('offline', 503),
  });
  const response = await refreshSession(new NextRequest('http://127.0.0.1:3000/workspaces'));
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe('AUTH_UNAVAILABLE');
});

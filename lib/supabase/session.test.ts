import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireSession } from '@/lib/supabase/session';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));

beforeEach(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: mocks.profile,
  };
  mocks.from.mockReset().mockReturnValue(query);
  mocks.getUser
    .mockReset()
    .mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
  mocks.profile.mockReset().mockResolvedValue({ data: { id: 'verified-user' }, error: null });
});

describe('validated application session', () => {
  it('returns only the Auth-validated identity with an active profile', async () => {
    expect((await requireSession()).user.id).toBe('verified-user');
    expect(mocks.from).toHaveBeenCalledWith('profiles');
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith('id', 'verified-user');
    expect(mocks.from.mock.results[0].value.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it.each([
    new AuthSessionMissingError(),
    new AuthApiError('invalid token', 401, 'bad_jwt'),
    new AuthApiError('expired refresh', 400, 'refresh_token_not_found'),
  ])('rejects missing, invalid, and unrefreshable sessions', async (error) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error });
    await expect(requireSession()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not turn an Auth outage into a successful or anonymous session', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('offline', 503),
    });
    await expect(requireSession()).rejects.toMatchObject({ status: 503, code: 'AUTH_UNAVAILABLE' });
  });

  it('denies a missing or soft-deleted application profile', async () => {
    mocks.profile.mockResolvedValue({ data: null, error: null });
    await expect(requireSession()).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_UNAVAILABLE',
    });
  });

  it('surfaces database failures without provider details', async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: 'private SQL error' } });
    await expect(requireSession()).rejects.toMatchObject({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  });
});

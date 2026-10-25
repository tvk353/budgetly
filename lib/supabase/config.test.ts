import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseConfig, SupabaseConfigurationError } from '@/lib/supabase/config';

afterEach(() => vi.unstubAllEnvs());

describe('Supabase public configuration', () => {
  it('accepts local development with a publishable key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_local_test');
    expect(getSupabaseConfig()).toEqual({
      url: 'http://127.0.0.1:54321',
      key: 'sb_publishable_local_test',
    });
  });

  it.each([
    ['', 'sb_publishable_test'],
    ['invalid', 'sb_publishable_test'],
    ['http://example.com', 'sb_publishable_test'],
    ['https://example.com', 'sb_secret_do_not_expose'],
    ['https://example.com', 'eyJlegacy.jwt.key'],
    ['https://user:password@example.com', 'sb_publishable_test'],
    ['https://example.com', ''],
  ])('rejects unsafe or missing configuration', (url, key) => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
    expect(getSupabaseConfig).toThrow(SupabaseConfigurationError);
  });
});

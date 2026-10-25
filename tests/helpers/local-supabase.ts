import { execSync } from 'node:child_process';

export function localSupabaseEnvironment() {
  if (process.env.BUDGETLY_LOCAL_AUTH_TESTS !== '1') {
    throw new Error(
      'Run browser tests with BUDGETLY_LOCAL_AUTH_TESTS=1 and local Supabase running.',
    );
  }
  const status = JSON.parse(
    execSync('pnpm exec supabase status --output json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  if (status.API_URL !== 'http://127.0.0.1:54321' || !status.SECRET_KEY?.startsWith('sb_secret_')) {
    throw new Error('Browser auth tests require the disposable Budgetly local Supabase stack.');
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL as string,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY as string,
    SUPABASE_SECRET_KEY: status.SECRET_KEY as string,
    AUTH_RATE_LIMIT_SECRET: 'budgetly-disposable-local-test-hash-secret-only',
    APP_ORIGIN: 'http://127.0.0.1:3100',
  };
}

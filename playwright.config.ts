import { defineConfig, devices } from '@playwright/test';
import { localSupabaseEnvironment } from './tests/helpers/local-supabase';

const localEnv =
  process.env.BUDGETLY_LOCAL_AUTH_TESTS === '1' ? localSupabaseEnvironment() : undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    env: localEnv,
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI && !localEnv,
    timeout: 120_000,
  },
});

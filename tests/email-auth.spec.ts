import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { localSupabaseEnvironment } from './helpers/local-supabase';

test.use({ trace: 'off' });
test.setTimeout(60_000);

async function requestCode(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/auth/otp/request') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  expect((await responsePromise).status()).toBe(202);
  await expect(page).toHaveURL(/\/verify\?/);
  let messageId = '';
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const body = await response.json();
        messageId = body.messages?.[0]?.ID ?? '';
        return Boolean(messageId);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const response = await page.request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`);
  const message = await response.json();
  const code = String(message.Text).match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error('Local email did not contain an OTP.');
  return { code, messageId };
}

async function cleanup(email: string, messageId: string, page: Page) {
  const env = localSupabaseEnvironment();
  const emailHash = createHmac('sha256', env.AUTH_RATE_LIMIT_SECRET).update(email).digest('hex');
  // Only exact test-generated identifiers are interpolated into this local cleanup.
  execFileSync(
    'docker',
    [
      'exec',
      'supabase_db_budgetly',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `begin;
    delete from public.workspaces where id in (select m.workspace_id from public.workspace_members m join auth.users u on u.id=m.user_id where u.email='${email}');
    delete from public.category_scopes where id in (select s.category_scope_id from public.category_scope_members s join auth.users u on u.id=s.user_id where u.email='${email}');
    delete from auth.users where email='${email}';
    delete from private.otp_challenges where email_hash='${emailHash}';
    delete from private.auth_rate_limits where key='email:${emailHash}';
    commit;`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (messageId) {
    const response = await page.request.delete('http://127.0.0.1:54324/api/v1/messages', {
      data: { IDs: [messageId] },
    });
    if (!response.ok()) throw new Error('Failed to clean up the local test email.');
  }
}

test('real emailed OTP persists, refreshes, isolates workspaces, and logs out', async ({
  page,
  context,
}) => {
  const email = `otp-${randomUUID()}@budgetly.test`;
  let messageId = '';
  try {
    const delivered = await requestCode(page, email);
    messageId = delivered.messageId;
    await page.getByLabel('Verification code').fill(delivered.code);
    await page.getByRole('button', { name: 'Verify email' }).click();
    await expect(page).toHaveURL(/\/workspaces$/);
    await expect(page.getByRole('button', { name: 'Choose Personal workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Household workspace' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Choose Personal workspace' })).toBeVisible();
    const response = await page.request.get('/api/v1/workspaces');
    expect(response.status()).toBe(200);
    const collection = await response.json();
    expect(collection.data).toHaveLength(1);
    const ownId = collection.data[0].id;
    expect((await page.request.get(`/api/v1/workspaces/${ownId}`)).status()).toBe(200);
    expect(
      (await page.request.get('/api/v1/workspaces/20000000-0000-4000-8000-000000000001')).status(),
    ).toBe(404);
    await page.goto('/workspace/household');
    await expect(page).toHaveURL(/\/workspaces$/);

    const cookies = await context.cookies();
    const authCookie = cookies.find((cookie) => cookie.name === 'sb-127-auth-token');
    if (!authCookie) throw new Error('Missing persisted local session cookie.');
    const session = JSON.parse(
      Buffer.from(authCookie.value.replace(/^base64-/, ''), 'base64url').toString(),
    );
    const originalRefreshToken = session.refresh_token;
    session.expires_at = 1;
    await context.addCookies([
      {
        ...authCookie,
        value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
      },
    ]);
    await page.goto('/workspaces');
    await expect(page.getByRole('button', { name: 'Choose Personal workspace' })).toBeVisible();
    const rotatedCookie = (await context.cookies()).find(
      (cookie) => cookie.name === 'sb-127-auth-token',
    );
    if (!rotatedCookie) throw new Error('Missing refreshed session cookie.');
    const rotatedSession = JSON.parse(
      Buffer.from(rotatedCookie.value.replace(/^base64-/, ''), 'base64url').toString(),
    );
    expect(rotatedSession.refresh_token !== originalRefreshToken).toBe(true);
    expect((await page.request.get('/api/v1/workspaces')).status()).toBe(200);

    await page.getByRole('button', { name: 'Sign Out of Budgetly' }).click();
    await expect(page).toHaveURL('http://127.0.0.1:3100/');
    expect((await page.request.get('/api/v1/workspaces')).status()).toBe(401);
    await page.goto('/workspaces');
    await expect(page).toHaveURL('http://127.0.0.1:3100/');

    const env = localSupabaseEnvironment();
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const revoked = await client.auth.refreshSession({
      refresh_token: rotatedSession.refresh_token,
    });
    expect(Boolean(revoked.error)).toBe(true);
  } finally {
    await cleanup(email, messageId, page);
  }
});

test('real provider rejects invalid codes; the application blocks the fourth attempt and immediate resend', async ({
  page,
}) => {
  const email = `invalid-${randomUUID()}@budgetly.test`;
  let messageId = '';
  try {
    const delivered = await requestCode(page, email);
    messageId = delivered.messageId;
    const wrongCode = delivered.code === '000000' ? '111111' : '000000';
    await page.getByRole('button', { name: 'Resend code' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please wait' })).toBeVisible();
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByLabel('Verification code').fill(wrongCode);
      const responsePromise = page.waitForResponse((response) =>
        response.url().endsWith('/api/v1/auth/otp/verify'),
      );
      await page.getByRole('button', { name: 'Verify email' }).click();
      expect((await responsePromise).status()).toBe(401);
    }
    // Even the correct provider OTP must be rejected after the attempt budget is exhausted.
    await page.getByLabel('Verification code').fill(delivered.code);
    await page.getByRole('button', { name: 'Verify email' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'invalid or expired' })).toBeVisible();
    await expect(page).toHaveURL(/\/verify\?/);
    expect((await page.request.get('/api/v1/workspaces')).status()).toBe(401);
  } finally {
    await cleanup(email, messageId, page);
  }
});

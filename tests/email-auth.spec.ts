import { execFile, execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { createHmac, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { localSupabaseEnvironment } from './helpers/local-supabase';
import { localDatabase } from './helpers/auth-fixture';

test.use({ trace: 'off' });
test.setTimeout(60_000);
test.describe.configure({ mode: 'serial' });

const sharedEmail = 'priyavinod.t@gmail.com';
function requireUnusedSharedEmail() {
  test.skip(
    localDatabase(`select exists(select 1 from auth.users where email='${sharedEmail}')`) !== 'f',
    'Shared address already exists locally; refusing to modify an existing account.',
  );
}

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

for (const account of ['shared', 'existing member'] as const) {
  test(`real emailed OTP for ${account} persists, refreshes, isolates workspaces, and logs out`, async ({
    page,
    context,
  }) => {
    if (account === 'shared') requireUnusedSharedEmail();
    const email = account === 'shared' ? sharedEmail : `member-${randomUUID()}@budgetly.test`;
    let messageId = '';
    try {
      if (account === 'existing member') {
        const env = localSupabaseEnvironment();
        const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
        if (error || !data.user)
          throw new Error('Unable to create disposable existing-member fixture.');
        const id = data.user.id;
        localDatabase(`begin;
        insert into public.profiles(id) values('${id}');
        insert into public.workspaces(name,type,created_by) values('Household','household','${id}');
        insert into public.workspace_members(workspace_id,user_id,role)
          select id,'${id}','owner' from public.workspaces where created_by='${id}';
        commit;`);
      }
      const delivered = await requestCode(page, email);
      messageId = delivered.messageId;
      await page.getByLabel('Verification code').fill(delivered.code);
      await page.getByRole('button', { name: 'Verify email' }).click();
      await expect(page).toHaveURL(/\/workspace\/household$/);
      await expect(page.getByRole('heading', { name: 'Where would you like to go?' })).toHaveCount(
        0,
      );
      await page.reload();
      await expect(page).toHaveURL(/\/workspace\/household$/);
      const response = await page.request.get('/api/v1/workspaces');
      expect(response.status()).toBe(200);
      const collection = await response.json();
      expect(collection.data).toHaveLength(2);
      const household = collection.data.find(
        (workspace: { type: string }) => workspace.type === 'household',
      );
      expect(household).toMatchObject({ name: 'Household', type: 'household' });
      const ownId = household.id;
      expect(
        (await context.cookies()).find(({ name }) => name === 'budgetly-workspace')?.value,
      ).toBe(ownId);
      expect((await page.request.get(`/api/v1/workspaces/${ownId}`)).status()).toBe(200);
      expect(
        (
          await page.request.get('/api/v1/workspaces/20000000-0000-4000-8000-000000000001')
        ).status(),
      ).toBe(404);
      await page.goto('/workspace/household');
      await expect(page).toHaveURL(/\/workspace\/household$/);

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
}

test('overlapping authenticated Household transactions preserve an existing Personal workspace', async () => {
  const userId = randomUUID();
  const claims = `set local role authenticated; set local request.jwt.claims='{"sub":"${userId}","role":"authenticated"}';`;
  // A DB-only SSO fixture avoids colliding with the real email-provider account.
  localDatabase(`begin;
    insert into auth.users(id,email,email_confirmed_at,is_sso_user) values('${userId}','${sharedEmail}',now(),true);
    ${claims} select public.ensure_personal_workspace(); commit;`);
  try {
    const personalBefore = localDatabase(
      `select row_to_json(w) from public.workspaces w where created_by='${userId}' and type='personal'`,
    );
    const blocker = spawn('docker', [
      'exec',
      '-i',
      'supabase_db_budgetly',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
    ]);
    let output = '';
    blocker.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    blocker.stdin.write(
      `begin; set local role authenticated; set local request.jwt.claims='{"sub":"${userId}","role":"authenticated"}'; select public.ensure_household_workspace(); select 'household-held';\n`,
    );
    let calls: Promise<{ stdout: string; stderr: string }>[] = [];
    try {
      await expect.poll(() => output, { timeout: 10_000 }).toContain('household-held');
      calls = Array.from({ length: 8 }, () =>
        promisify(execFile)('docker', [
          'exec',
          'supabase_db_budgetly',
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-X',
          '-qAt',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `begin; ${claims} select public.ensure_household_workspace(); commit;`,
        ]),
      );
      await expect
        .poll(
          () =>
            Number(
              localDatabase(
                `select count(*) from pg_stat_activity where datname='postgres' and wait_event_type='Lock' and query like '%ensure_household_workspace%'`,
              ),
            ),
          { timeout: 10_000 },
        )
        .toBeGreaterThanOrEqual(2);
    } finally {
      if (blocker.exitCode === null) {
        const exited = once(blocker, 'exit');
        blocker.stdin.end('commit;\n');
        await exited;
      }
      expect(blocker.exitCode).toBe(0);
      const results = await Promise.all(calls);
      expect(results).toHaveLength(8);
      expect(new Set(results.map((result) => result.stdout.trim())).size).toBe(1);
    }
    expect(
      localDatabase(
        `select row_to_json(w) from public.workspaces w where created_by='${userId}' and type='personal'`,
      ),
    ).toBe(personalBefore);
    expect(
      localDatabase(
        `select count(*) from public.workspaces where created_by='${userId}' and type='household'`,
      ),
    ).toBe('1');
    expect(
      localDatabase(
        `select count(*) from public.workspace_members where user_id='${userId}' and role='owner' and status='active'`,
      ),
    ).toBe('2');
    expect(
      localDatabase(`begin; ${claims} select public.ensure_household_workspace(); commit;`),
    ).toMatch(/^[0-9a-f-]{36}$/);
  } finally {
    localDatabase(`begin;
      delete from public.workspaces where created_by='${userId}';
      delete from public.category_scopes where id in (select category_scope_id from public.category_scope_members where user_id='${userId}');
      delete from auth.users where id='${userId}'; commit;`);
  }
});

test('verified outsiders without Household membership are denied and their new session is closed', async ({
  page,
}) => {
  const email = `outsider-${randomUUID()}@budgetly.test`;
  let messageId = '';
  try {
    const delivered = await requestCode(page, email);
    messageId = delivered.messageId;
    await page.getByLabel('Verification code').fill(delivered.code);
    await page.getByRole('button', { name: 'Verify email' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'active Household membership is required' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/verify\?/);
    expect((await page.request.get('/api/v1/workspaces')).status()).toBe(401);
    expect(
      localDatabase(
        `select count(*) from public.workspaces w join auth.users u on u.id=w.created_by where u.email='${email}'`,
      ),
    ).toBe('0');
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

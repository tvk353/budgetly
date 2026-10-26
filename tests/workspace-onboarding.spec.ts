import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { expect, localDatabase, test } from './helpers/auth-fixture';

test.use({ trace: 'off' });
test.setTimeout(60_000);

test('loads distinct real workspace names, retains the exact selected Household across pages and reloads', async ({
  page,
  workspaceIdentity,
}) => {
  const { userId, workspaceId } = workspaceIdentity;
  const secondId = randomUUID();
  localDatabase(`begin;
    update public.workspaces set name='Family home' where id='${workspaceId}';
    insert into public.workspaces(id,name,type,created_by) values('${secondId}','Weekend home','household','${userId}');
    insert into public.workspace_members(workspace_id,user_id,role) values('${secondId}','${userId}','owner');
    commit;`);
  await page.goto('/workspaces');
  await expect(page.getByRole('button', { name: 'Choose Family home workspace' })).toBeVisible();
  await expect(
    page
      .getByRole('button', { name: 'Choose Family home workspace' })
      .getByText('Default workspace'),
  ).toBeVisible();
  await page.goto('/more');
  await expect(
    page.getByRole('link', { name: 'Switch workspace, currently Family home', exact: true }),
  ).toBeVisible();
  await page.goto('/workspaces');
  await page.getByRole('button', { name: 'Choose Weekend home workspace' }).click();
  await expect(page).toHaveURL(/\/workspace\/household$/);
  await expect(
    page.getByRole('link', { name: 'Switch workspace, currently Weekend home', exact: true }),
  ).toBeVisible();
  const preference = (await page.context().cookies()).find(
    ({ name }) => name === 'budgetly-workspace',
  );
  expect(preference).toMatchObject({ value: secondId, httpOnly: true, sameSite: 'Lax' });
  await page.getByRole('link', { name: 'Budget', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Switch workspace, currently Weekend home', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Switch workspace, currently Weekend home', exact: true }),
  ).toBeVisible();
  for (const path of ['/transactions', '/savings', '/trackers', '/more']) {
    await page.goto(path);
    await expect(
      page.getByRole('link', {
        name: /Weekend home.*switch workspace|Switch workspace, currently Weekend home/i,
      }),
    ).toBeVisible();
  }
});

test('rechecks selection against RLS and refuses foreign IDs without overwriting preference', async ({
  page,
  workspaceIdentity,
}) => {
  const foreignUser = randomUUID();
  const foreignWorkspace = randomUUID();
  try {
    localDatabase(`begin;
      insert into auth.users(id,email,email_confirmed_at) values('${foreignUser}','browser-${foreignUser}@budgetly.test',now());
      insert into public.profiles(id) values('${foreignUser}');
      insert into public.workspaces(id,name,type,created_by) values('${foreignWorkspace}','Someone else private','personal','${foreignUser}');
      insert into public.workspace_members(workspace_id,user_id,role) values('${foreignWorkspace}','${foreignUser}','owner');
      commit;`);
    await page.goto('/workspaces');
    await expect(
      page.getByRole('button', { name: 'Choose Someone else private workspace' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Choose Household workspace' }).click();
    await expect(page).toHaveURL(/\/workspace\/household$/);
    const response = await page.request.post('/api/v1/workspaces/selection', {
      headers: { origin: 'http://127.0.0.1:3100' },
      data: { workspace_id: foreignWorkspace },
    });
    expect(response.status()).toBe(404);
    expect((await page.request.get(`/api/v1/workspaces/${foreignWorkspace}`)).status()).toBe(404);
    expect(
      (await page.context().cookies()).find(({ name }) => name === 'budgetly-workspace')?.value,
    ).toBe(workspaceIdentity.workspaceId);
    await page
      .context()
      .addCookies([
        { name: 'budgetly-workspace', value: foreignWorkspace, domain: '127.0.0.1', path: '/' },
      ]);
    await page.goto('/budget');
    await expect(page).toHaveURL(/\/workspaces$/);
  } finally {
    localDatabase(`begin;
      delete from public.workspaces where id='${foreignWorkspace}';
      delete from public.category_scopes where id in (select category_scope_id from public.category_scope_members where user_id='${foreignUser}');
      delete from auth.users where id='${foreignUser}'; commit;`);
  }
});

test('a selected Household disappears immediately after membership removal and relogin provisioning cannot restore it', async ({
  page,
  workspaceIdentity,
}) => {
  const { userId, workspaceId, client } = workspaceIdentity;
  const newOwner = randomUUID();
  await page.goto('/workspaces');
  await page.getByRole('button', { name: 'Choose Household workspace' }).click();
  await expect(page).toHaveURL(/\/workspace\/household$/);
  try {
    localDatabase(`begin;
      insert into auth.users(id,email,email_confirmed_at) values('${newOwner}','browser-${newOwner}@budgetly.test',now());
      insert into public.profiles(id) values('${newOwner}');
      update public.workspace_members set role='member' where workspace_id='${workspaceId}' and user_id='${userId}';
      insert into public.workspace_members(workspace_id,user_id,role) values('${workspaceId}','${newOwner}','owner');
      update public.workspace_members set status='removed',removed_at=now() where workspace_id='${workspaceId}' and user_id='${userId}';
      commit;`);
    expect((await client.rpc('ensure_household_workspace')).error?.code).toBe('42501');
    expect((await page.request.get(`/api/v1/workspaces/${workspaceId}`)).status()).toBe(404);
    await page.reload();
    await expect(page).toHaveURL(/\/workspaces$/);
    await expect(page.getByRole('button', { name: 'Choose Personal workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Household workspace' })).toHaveCount(0);
    expect(
      localDatabase(
        `select status from public.workspace_members where workspace_id='${workspaceId}' and user_id='${userId}'`,
      ),
    ).toBe('removed');
  } finally {
    localDatabase(`begin;
      delete from public.workspaces where id='${workspaceId}';
      delete from public.category_scopes where id in (select category_scope_id from public.category_scope_members where user_id='${newOwner}');
      delete from auth.users where id='${newOwner}'; commit;`);
  }
});

test('a deleted selected Household cannot open workspace or financial pages', async ({
  page,
  workspaceIdentity,
}) => {
  await page.goto('/workspaces');
  await page.getByRole('button', { name: 'Choose Household workspace' }).click();
  await expect(page).toHaveURL(/\/workspace\/household$/);
  localDatabase(
    `update public.workspaces set deleted_at=now(),purge_after=now()+interval '30 days' where id='${workspaceIdentity.workspaceId}'`,
  );
  expect(
    (await page.request.get(`/api/v1/workspaces/${workspaceIdentity.workspaceId}`)).status(),
  ).toBe(404);
  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/workspaces$/);
  await expect(page.getByRole('button', { name: 'Choose Household workspace' })).toHaveCount(0);
});

test.describe('Personal-first onboarding', () => {
  test.use({ includeHousehold: false });
  test('loads only Personal and uses it as default without granting Household membership', async ({
    page,
    workspaceIdentity,
  }) => {
    await page.goto('/more');
    await expect(
      page.getByRole('link', { name: 'Switch workspace, currently Personal', exact: true }),
    ).toBeVisible();
    await page.goto('/workspaces');
    const button = page.getByRole('button', { name: 'Choose Personal workspace' });
    await expect(button.getByText('Default workspace')).toBeVisible();
    await expect(page.getByText(/Household setup is limited to the shared account/)).toBeVisible();
    expect(
      localDatabase(
        `select count(*) from public.workspace_members m join public.workspaces w on w.id=m.workspace_id where m.user_id='${workspaceIdentity.userId}' and w.type='household'`,
      ),
    ).toBe('0');
    await button.click();
    await expect(page).toHaveURL(/\/workspace\/personal$/);
    await page.goto('/more');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/workspace\/personal$/);
    await page.goto('/workspace/household');
    await expect(page).toHaveURL(/\/workspaces$/);
  });
});

test.describe('overlapping first-login provisioning', () => {
  test.use({ includeHousehold: false, provisionPersonal: false });
  test('serializes real overlapping authenticated transactions into one Personal workspace', async ({
    workspaceIdentity,
  }) => {
    test.setTimeout(60_000);
    const { client, userId } = workspaceIdentity;
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
    // Hold the first successful provisioning uncommitted while real user RPCs overlap.
    blocker.stdin.write(
      `begin; set local role authenticated; set local request.jwt.claims='{"sub":"${userId}","role":"authenticated"}'; select public.ensure_personal_workspace(); select 'provisioning-held';\n`,
    );
    let calls: PromiseLike<{ error: unknown }>[] = [];
    try {
      await expect.poll(() => output, { timeout: 10_000 }).toContain('provisioning-held');
      calls = Array.from({ length: 8 }, () =>
        client.rpc('ensure_personal_workspace').then((result) => result),
      );
      await expect
        .poll(
          () =>
            Number(
              localDatabase(
                `select count(*) from pg_stat_activity where datname='postgres' and wait_event_type='Lock' and query like '%ensure_personal_workspace%'`,
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
      for (const result of results) expect(result.error).toBeNull();
    }
    expect(localDatabase(`select count(*) from public.profiles where id='${userId}'`)).toBe('1');
    expect(
      localDatabase(`select count(*) from public.category_scope_members where user_id='${userId}'`),
    ).toBe('1');
    expect(
      localDatabase(
        `select count(*) from public.workspaces where created_by='${userId}' and type='personal'`,
      ),
    ).toBe('1');
    expect(
      localDatabase(
        `select count(*) from public.workspace_members where user_id='${userId}' and role='owner' and status='active'`,
      ),
    ).toBe('1');
    expect((await client.rpc('ensure_personal_workspace')).error).toBeNull();
    const workspaces = await client.from('workspaces').select('id,type');
    expect(workspaces.error).toBeNull();
    expect(workspaces.data).toEqual([{ id: expect.any(String), type: 'personal' }]);
  });
});

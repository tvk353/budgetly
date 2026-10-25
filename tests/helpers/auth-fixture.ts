import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { test as base, expect } from '@playwright/test';
import { localSupabaseEnvironment } from './local-supabase';
import type { Database } from '../../lib/supabase/database.types';

export function localDatabase(sql: string) {
  if (process.env.BUDGETLY_LOCAL_AUTH_TESTS !== '1') {
    throw new Error('Database fixtures require explicitly enabled local Supabase tests.');
  }
  return execFileSync(
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
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}

export const test = base.extend<{
  includeHousehold: boolean;
  provisionPersonal: boolean;
  workspaceIdentity: { userId: string; workspaceId: string; client: SupabaseClient<Database> };
}>({
  includeHousehold: [true, { option: true }],
  provisionPersonal: [true, { option: true }],
  workspaceIdentity: [
    async ({ context, includeHousehold, provisionPersonal }, use) => {
      const env = localSupabaseEnvironment();
      const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const email = `browser-${randomUUID()}@budgetly.test`;
      const password = randomUUID();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error('Unable to create disposable local test user.');
      const userId = data.user.id;
      const workspaceId = randomUUID();
      try {
        const cookieValues: { name: string; value: string; options: CookieOptions }[] = [];
        const client = createServerClient<Database>(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          {
            cookies: {
              getAll: () => cookieValues.map(({ name, value }) => ({ name, value })),
              setAll: (values) => {
                for (const cookie of values) {
                  const index = cookieValues.findIndex(({ name }) => name === cookie.name);
                  if (index === -1) cookieValues.push(cookie);
                  else cookieValues[index] = cookie;
                }
              },
            },
          },
        );
        const { error: loginError } = await client.auth.signInWithPassword({ email, password });
        if (loginError) throw new Error('Unable to sign in disposable test user.');
        if (provisionPersonal) {
          const { error: provisionError } = await client.rpc('ensure_personal_workspace');
          if (provisionError)
            throw new Error(
              `Unable to provision disposable test workspace (${provisionError.code}).`,
            );
        }
        if (includeHousehold)
          localDatabase(
            `begin; insert into public.workspaces (id,name,type,created_by) values ('${workspaceId}','Household','household','${userId}');
        insert into public.workspace_members (workspace_id,user_id,role) values ('${workspaceId}','${userId}','owner'); commit;`,
          );
        await context.addCookies(
          cookieValues.map(({ name, value, options }) => ({
            name,
            value,
            domain: '127.0.0.1',
            path: '/',
            httpOnly: options.httpOnly ?? false,
            secure: false,
            sameSite: 'Lax' as const,
          })),
        );
        await use({ userId, workspaceId, client });
      } finally {
        localDatabase(
          `begin; delete from public.workspaces where created_by = '${userId}' or id in (select workspace_id from public.workspace_members where user_id = '${userId}');
        delete from public.category_scopes where id in (select category_scope_id from public.category_scope_members where user_id = '${userId}');
        delete from auth.users where id = '${userId}'; commit;`,
        );
      }
    },
    { auto: true },
  ],
});
export { expect };

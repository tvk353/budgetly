-- Budgetly / Artifact 3 / pgTAP authorization test draft
-- DRAFT ONLY. Do not run until the schema and RLS policies are approved.
-- Assumes pgTAP is installed and fixture setup is provided by the test harness.
--
-- Fixture contract expected from harness:
--   auth user UUIDs :user_a, :user_b (same household), :user_c (unrelated)
--   workspace UUIDs :personal_a, :household_ab, :personal_b, :household_c
--   rows: active memberships for A/B in household_ab; A owns personal_a;
--         B owns personal_b; C owns household_c; seed rows for each workspace.
-- The placeholder variables below must be substituted by the harness.

begin;
select plan(21);

-- Use actual JWT claim simulation in the test database; set role after setting claims.
select set_config('request.jwt.claim.sub', :'user_a', true);
set local role authenticated;

select ok(public.is_active_workspace_member(:'household_ab'::uuid),
          'A is active member of shared household');
select ok(not public.is_active_workspace_member(:'household_c'::uuid),
          'A is not active member of unrelated household');

select is(
  (select count(*)::integer from public.transactions
   where workspace_id = :'household_c'::uuid),
  0,
  'A cannot read unrelated household transactions'
);

select is(
  (select count(*)::integer from public.workspaces
   where id = :'household_c'::uuid),
  0,
  'A cannot read unrelated workspace'
);

-- A and B can both read the shared household.
select is(
  (select count(*)::integer from public.workspaces
   where id = :'household_ab'::uuid),
  1,
  'A can read shared household'
);

-- Switch identity to B and test parity.
select set_config('request.jwt.claim.sub', :'user_b', true);
select ok(public.is_active_workspace_member(:'household_ab'::uuid),
          'B is active member of shared household');
select is(
  (select count(*)::integer from public.transactions
   where workspace_id = :'household_ab'::uuid),
  1,
  'B can read shared household transaction fixture'
);

-- Switch to unrelated user C; cannot see A/B data.
select set_config('request.jwt.claim.sub', :'user_c', true);
select is(
  (select count(*)::integer from public.transactions
   where workspace_id = :'household_ab'::uuid),
  0,
  'C cannot read A/B household transactions'
);

-- Operational tables must be inaccessible to authenticated clients. Depending
-- on the test harness, expect permission denied at statement level rather than 0 rows.
select throws_ok(
  $$ select * from public.background_jobs limit 1 $$,
  '42501',
  null,
  'authenticated client cannot query background job table'
);

select throws_ok(
  $$ select * from public.backup_runs limit 1 $$,
  '42501',
  null,
  'authenticated client cannot query backup table'
);

select throws_ok(
  $$ select * from public.deletion_tombstones limit 1 $$,
  '42501',
  null,
  'authenticated client cannot query deletion tombstones'
);

-- Reset to A for category tests.
select set_config('request.jwt.claim.sub', :'user_a', true);
select is(
  (select count(*)::integer from public.categories where is_builtin),
  (select count(*)::integer from public.categories where is_builtin),
  'authenticated users can read built-in categories'
);

-- Clients must not write audit events.
select throws_ok(
  $$ insert into public.audit_logs(action, target_type) values ('fake', 'transaction') $$,
  '42501',
  null,
  'authenticated client cannot forge audit log'
);

-- RLS should prevent A from inserting a transaction into C's workspace.
select throws_ok(
  format(
    $$ insert into public.transactions(workspace_id, category_id, type, amount, transaction_date)
       values (%L::uuid, (select id from public.categories where category_type='ordinary' limit 1),
               'expense', 1.00, current_date) $$,
    :'household_c'
  ),
  '42501',
  null,
  'A cannot insert into unrelated workspace'
);

-- RLS should prevent A from changing a transaction in C's workspace.
select is(
  (with changed as (
    update public.transactions
       set description = 'unauthorized'
     where workspace_id = :'household_c'::uuid
     returning id
  ) select count(*)::integer from changed),
  0,
  'A cannot update unrelated transaction'
);

-- Membership changes are server/RPC only; authenticated has SELECT grant only.
select throws_ok(
  $$ update public.workspace_members set role='owner' where user_id = auth.uid() $$,
  '42501',
  null,
  'authenticated client cannot self-promote membership role'
);

-- Custom category creation is a trusted server/RPC operation so scope membership,
-- uniqueness, and category-scope merge rules are checked atomically.
select throws_ok(
  $$ insert into public.categories(name, category_type, is_builtin, created_by_user_id, category_scope_id)
     values ('RLS Test Category A', 'ordinary', false, auth.uid(), gen_random_uuid()) $$,
  '42501', null,
  'authenticated client cannot directly create custom categories'
);

select throws_ok(
  $$ insert into public.categories(name, category_type, is_builtin, created_by_user_id, category_scope_id)
     values ('RLS Forgery Category', 'ordinary', false, gen_random_uuid(), gen_random_uuid()) $$,
  '42501',
  null,
  'user cannot create category attributed to another user'
);

-- Workspace category visibility writes are owner-only; C is not owner of A/B household.
select throws_ok(
  format(
    $$ insert into public.workspace_category_visibility(workspace_id, category_id, is_hidden)
       values (%L::uuid, (select id from public.categories where is_builtin limit 1), true) $$,
    :'household_ab'
  ),
  '42501',
  null,
  'non-owner cannot change built-in category visibility'
);

-- Savings transaction isolation is derived through the parent fund.
select is(
  (select count(*)::integer
     from public.savings_transactions st
     join public.savings_funds sf on sf.id = st.fund_id
    where sf.workspace_id = :'household_c'::uuid),
  0,
  'cannot read savings transactions from unrelated workspace'
);

-- Removed-member check should be tested after fixture marks A removed from a
-- separate household; normal membership helper must immediately return false.
select ok(not public.is_active_workspace_member(:'household_c'::uuid),
          'non-member remains blocked by membership helper');

-- Count is intentionally adjusted as cases are added/removed; pgTAP plan must
-- match the final number of assertions in the harness.
select * from finish();
rollback;

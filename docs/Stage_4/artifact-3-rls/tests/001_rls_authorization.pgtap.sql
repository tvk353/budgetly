-- Budgetly / Artifact 3 / pgTAP authorization test draft
-- DRAFT ONLY. Do not run until the schema and RLS policies are approved.
-- Assumes pgTAP is installed and fixture setup is provided by the test harness.
--
-- Deterministic fixture contract expected from the harness (fixed UUIDs, not random):
--   user_a owns household_abc; user_b and user_c are additional active members.
--   user_d was removed from household_abc; user_e is unrelated and owns household_e.
--   A/B/C each own a personal workspace and category scope. household_abc links all
--   three scopes; household_e links only E's scope. Seed transaction, fund, savings,
--   tracker, tracker-transaction, label, invitation, and built-in-category IDs below.
--   Fixed row IDs used below: :builtin_category, :category_a, :category_unlinked,
--   :expense_a, :fund_a, :savings_transaction_a, :tracker_a,
--   :tracker_transaction_a, :label_a, :budget_a, and :invitation_a.
-- The harness supplies these fixed identifiers and seeds auth.users through its
-- version-pinned local fixture helper; this draft does not assume auth.users columns.

begin;
select no_plan();

-- Use actual JWT claim simulation in the test database; set role after setting claims.
select set_config('request.jwt.claim.sub', :'user_a', true);
set local role authenticated;

select is(
  (select count(*)::integer
     from (values
       ('profiles'), ('workspaces'), ('workspace_members'), ('workspace_invitations'),
       ('account_deletion_requests'), ('workspace_deletion_requests'), ('category_scopes'),
       ('category_scope_members'), ('workspace_category_scopes'), ('idempotency_records'),
       ('categories'), ('workspace_category_visibility'), ('labels'), ('transactions'),
       ('monthly_budgets'), ('savings_funds'), ('savings_transactions'), ('trackers'),
       ('tracker_transactions'), ('audit_logs'), ('background_jobs'), ('export_jobs'),
       ('backup_runs'), ('deletion_tombstones')
     ) expected(table_name)
     left join pg_catalog.pg_class c
       on c.oid = to_regclass(format('public.%I', expected.table_name))
    where c.oid is null or not c.relrowsecurity),
  0,
  'every expected public application table exists and has RLS enabled'
);

select ok(public.is_active_workspace_member(:'household_abc'::uuid),
          'A is active member of shared household');
select ok(not public.is_active_workspace_member(:'household_e'::uuid),
          'A is not active member of unrelated household');

select is(
  (select count(*)::integer from public.transactions
    where workspace_id = :'household_e'::uuid),
  0,
  'A cannot read unrelated household transactions'
);

select is(
  (select count(*)::integer from public.workspaces
    where id = :'household_e'::uuid),
  0,
  'A cannot read unrelated workspace'
);

-- A and B can both read the shared household.
select is(
  (select count(*)::integer from public.workspaces
  where id = :'household_abc'::uuid),
  1,
  'A can read shared household'
);

-- Switch identity to B and test parity.
select set_config('request.jwt.claim.sub', :'user_b', true);
select ok(public.is_active_workspace_member(:'household_abc'::uuid),
          'B is active member of shared household');
select is(
  (select count(*)::integer from public.transactions
   where id = '60000000-0000-4000-8000-000000000001'::uuid),
  1,
  'B can read shared household transaction fixture'
);

-- Switch to unrelated user E; cannot see A/B/C data.
select set_config('request.jwt.claim.sub', :'user_e', true);
select is(
  (select count(*)::integer from public.transactions
   where workspace_id = :'household_abc'::uuid),
  0,
  'E cannot read A/B/C household transactions'
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
select ok(
  exists (select 1 from public.categories
          where id = :'builtin_category'::uuid and is_builtin),
  'authenticated users can read built-in categories'
);

-- Clients must not write audit events.
select throws_ok(
  $$ insert into public.audit_logs(action, target_type) values ('fake', 'transaction') $$,
  '42501',
  null,
  'authenticated client cannot forge audit log'
);

-- RLS should prevent A from inserting a transaction into E's workspace.
select throws_ok(
  format(
    $$ insert into public.transactions(workspace_id, category_id, type, amount, transaction_date)
             values (%L::uuid, (select id from public.categories
                                 where category_type='ordinary' and is_builtin limit 1),
               'expense', 1.00, (now() at time zone 'Asia/Kolkata')::date) $$,
    :'household_e'
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
    where workspace_id = :'household_e'::uuid
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
select throws_ok(
  $$ select public.shares_active_workspace_with(auth.uid()) $$,
  '42501', null,
  'authenticated client cannot query the workspace relationship helper'
);
select ok(
  not has_function_privilege('authenticated', 'public.guard_transaction_refund()', 'EXECUTE'),
  'trigger-only integrity function is not directly executable by authenticated clients'
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

-- Workspace category visibility writes are owner-only; B is not the owner.
select set_config('request.jwt.claim.sub', :'user_b', true);
select throws_ok(
  format(
    $$ insert into public.workspace_category_visibility(workspace_id, category_id, is_hidden)
       values (%L::uuid, (select id from public.categories where is_builtin limit 1), true) $$,
    :'household_abc'
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
    where sf.workspace_id = :'household_e'::uuid),
  0,
  'cannot read savings transactions from unrelated workspace'
);

-- D was an active member and then removed from household_abc.
select set_config('request.jwt.claim.sub', :'user_d', true);
select ok(not public.is_active_workspace_member(:'household_abc'::uuid),
          'removed member loses access immediately');

select is(
  (select count(*)::integer from public.transactions
   where workspace_id = :'household_abc'::uuid),
  0,
  'removed member cannot read household rows by known workspace ID'
);

-- The invitation hash is not selectable, although safe invitation fields are.
select set_config('request.jwt.claim.sub', :'user_a', true);
select is(
  (select count(id)::integer from public.workspace_invitations
   where id = :'invitation_a'::uuid),
  1,
  'active member can list a safe invitation row'
);
select throws_ok(
  format('select token_hash from public.workspace_invitations where id = %L::uuid', :'invitation_a'),
  '42501', null,
  'authenticated client cannot read invitation token hash'
);

-- Client roles cannot physically delete Trash-managed finance records.
select throws_ok(format('delete from public.transactions where id = %L::uuid', :'expense_a'),
  '42501', null, 'authenticated client cannot hard-delete a transaction');
select throws_ok(format('delete from public.savings_funds where id = %L::uuid', :'fund_a'),
  '42501', null, 'authenticated client cannot cascade-delete savings history');
select throws_ok(format('delete from public.savings_transactions where id = %L::uuid', :'savings_transaction_a'),
  '42501', null, 'authenticated client cannot hard-delete a savings transaction');
select throws_ok(format('delete from public.trackers where id = %L::uuid', :'tracker_a'),
  '42501', null, 'authenticated client cannot hard-delete a tracker');
select throws_ok(format('delete from public.tracker_transactions where id = %L::uuid', :'tracker_transaction_a'),
  '42501', null, 'authenticated client cannot hard-delete a tracker transaction');
select throws_ok(format('delete from public.labels where id = %L::uuid', :'label_a'),
  '42501', null, 'authenticated client cannot hard-delete a label');
select throws_ok(format('delete from public.monthly_budgets where id = %L::uuid', :'budget_a'),
  '42501', null, 'authenticated client cannot hard-delete a budget');

-- Lifecycle and tenancy columns cannot be altered through direct updates.
select throws_ok(format(
  'update public.transactions set deleted_at = now(), purge_after = now() + interval ''30 days'' where id = %L::uuid',
  :'expense_a'), '42501', null, 'authenticated client cannot set Trash metadata directly');
select throws_ok(format(
  'update public.transactions set workspace_id = %L::uuid where id = %L::uuid',
  :'household_e', :'expense_a'), '42501', null, 'authenticated client cannot reparent a transaction');
select throws_ok(format(
  'update public.savings_funds set deleted_at = now() where id = %L::uuid',
  :'fund_a'), '42501', null, 'authenticated client cannot set fund Trash metadata directly');
select throws_ok(format(
  'update public.tracker_transactions set amount = amount + 1 where id = %L::uuid',
  :'tracker_transaction_a'), '42501', null, 'authenticated client cannot directly edit tracker transactions');
select throws_ok(format(
  'update public.trackers set status = ''ended'' where id = %L::uuid',
  :'tracker_a'), '42501', null, 'authenticated client cannot bypass tracker end workflow');
select throws_ok(format(
  'update public.labels set deleted_at = now() where id = %L::uuid',
  :'label_a'), '42501', null, 'authenticated client cannot set label Trash metadata directly');

-- B can access A's custom category through the linked household scope, but not
-- a valid category scope that is not linked to this workspace.
select set_config('request.jwt.claim.sub', :'user_b', true);
select is(
  (select count(*)::integer from public.categories where id = :'category_a'::uuid),
  1,
  'active household member can read a linked member category'
);
select is(
  (select count(*)::integer from public.categories where id = :'category_unlinked'::uuid),
  0,
  'active household member cannot read an unlinked category scope'
);
select throws_ok(format(
  $$ insert into public.transactions(workspace_id, category_id, type, amount, transaction_date)
       values (%L::uuid, %L::uuid, 'expense', 1.00,
         (now() at time zone 'Asia/Kolkata')::date) $$,
  :'household_abc', :'category_unlinked'),
  '23514', null, 'transaction cannot use a category from an unlinked scope');

-- Future budget rows are rejected in the database, even for a member who can
-- otherwise create the workspace budget.
select throws_ok(format(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values (%L::uuid,
       (date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '1 month')::date,
       100, 0) $$,
  :'household_abc'),
  '23514', null, 'authenticated client cannot create a future-month budget');

-- Anonymous role has no direct application-table privileges.
reset role;
set local role anon;
select throws_ok(
  $$ select * from public.transactions limit 1 $$,
  '42501', null,
  'anonymous client cannot read transactions'
);
reset role;
set local role authenticated;

reset role;
select * from finish();
rollback;

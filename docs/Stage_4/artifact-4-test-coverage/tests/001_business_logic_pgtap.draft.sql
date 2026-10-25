-- Budgetly Artifact 4: business-logic pgTAP outline
-- DRAFT ONLY. Not executed. Requires final schema/RPC reconciliation and disposable DB fixtures.
-- This file intentionally avoids pretending that not-yet-approved service functions exist.
-- Use one transaction and synthetic fixtures only.
--
-- Deterministic fixture variables supplied by the local harness:
-- :user_a, :household_abc, :ordinary_category, :tracker_category,
-- :expense_refund_case, :expense_update_case, :refund_update_case,
-- :expense_reduce_case, :tracker_expense_refund_case, :tracker_refund_update_case,
-- :trash_transaction_case, :backup_job_id, :export_job_id, :empty_job_id.
-- These names map to fixed UUIDs and seeded relationships in TEST_STRATEGY.md.
--
-- Run only after the schema and RLS artifacts are reconciled and approved.

begin;
select no_plan();

-- Amount and budget table constraints (adapt fixture IDs in harness).
select throws_ok(format(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values (%L::uuid, date_trunc('month', now() at time zone 'Asia/Kolkata')::date, -1, 0) $$,
  :'household_abc'),
  '23514',
  null,
  'negative base budget is rejected by check constraint'
);

select throws_ok(format(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values (%L::uuid, date_trunc('month', now() at time zone 'Asia/Kolkata')::date, 100, -1) $$,
  :'household_abc'),
  '23514',
  null,
  'negative rollover is rejected by check constraint'
);

select throws_ok(format(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values (%L::uuid, date_trunc('month', now() at time zone 'Asia/Kolkata')::date, 100, 0),
            (%L::uuid, date_trunc('month', now() at time zone 'Asia/Kolkata')::date, 200, 0) $$,
  :'household_abc', :'household_abc'),
  '23505',
  null,
  'workspace cannot have duplicate budget for the same month'
);

select throws_ok(format(
  $$ insert into public.transactions(workspace_id, type, amount, transaction_date, category_id)
     values (%L::uuid, 'expense', 0, (now() at time zone 'Asia/Kolkata')::date, %L::uuid) $$,
  :'household_abc', :'ordinary_category'),
  '23514',
  null,
  'zero transaction amount is rejected'
);

select throws_ok(format(
  $$ insert into public.transactions(workspace_id, type, amount, transaction_date, category_id,
                                     needs_category_correction)
     values (%L::uuid, 'expense', 10, (now() at time zone 'Asia/Kolkata')::date,
             null, false) $$,
  :'household_abc'),
  '23514',
  null,
  'missing category requires correction flag'
);

select throws_ok(format(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values (%L::uuid,
       (date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '1 month')::date,
       100, 0) $$,
  :'household_abc'),
  '23514', null, 'future-month budget insert is rejected');

-- The seeded expense_refund_case is 1000.00 with no linked refunds.
select lives_ok(format(
  $$ insert into public.transactions(workspace_id, category_id, type, amount,
                                     transaction_date, linked_expense_id)
     values (%L::uuid, %L::uuid, 'refund', 600.00,
             (now() at time zone 'Asia/Kolkata')::date, %L::uuid) $$,
  :'household_abc', :'ordinary_category', :'expense_refund_case'),
  'linked partial refund within remaining amount succeeds');
select lives_ok(format(
  $$ insert into public.transactions(workspace_id, category_id, type, amount,
                                     transaction_date, linked_expense_id)
     values (%L::uuid, %L::uuid, 'refund', 400.00,
             (now() at time zone 'Asia/Kolkata')::date, %L::uuid) $$,
  :'household_abc', :'ordinary_category', :'expense_refund_case'),
  'partial refunds summing exactly to expense amount succeed');
select throws_ok(format(
  $$ insert into public.transactions(workspace_id, category_id, type, amount,
                                     transaction_date, linked_expense_id)
     values (%L::uuid, %L::uuid, 'refund', 0.01,
             (now() at time zone 'Asia/Kolkata')::date, %L::uuid) $$,
  :'household_abc', :'ordinary_category', :'expense_refund_case'),
  '23514', null, 'linked refund one paise over cap is rejected');

-- expense_update_case is 500.00 with another active 100.00 refund;
-- refund_update_case is the remaining 100.00 refund.
select lives_ok(format(
  $$ update public.transactions set amount = 400.00 where id = %L::uuid $$,
  :'refund_update_case'),
  'refund update to the exact remaining amount succeeds');
select throws_ok(format(
  $$ update public.transactions set amount = 400.01 where id = %L::uuid $$,
  :'refund_update_case'),
  '23514', null, 'refund update above remaining amount is rejected');
select throws_ok(format(
  $$ update public.transactions set amount = 599.99 where id = %L::uuid $$,
  :'expense_reduce_case'),
  '23514', null, 'expense cannot be reduced below active linked refunds');

-- tracker_expense_refund_case is 1000.00 with a separate 600.00 refund;
-- tracker_refund_update_case is its remaining 400.00 refund.
select lives_ok(format(
  $$ update public.tracker_transactions set amount = 399.99 where id = %L::uuid $$,
  :'tracker_refund_update_case'),
  'tracker refund update within the remaining amount succeeds');
select throws_ok(format(
  $$ update public.tracker_transactions set amount = 400.01 where id = %L::uuid $$,
  :'tracker_refund_update_case'),
  '23514', null, 'tracker refund update above remaining amount is rejected');

-- A fixed timestamp makes the 30-day Trash interval deterministic.
select lives_ok(format(
  $$ update public.transactions
       set deleted_at = '2026-10-01 12:00:00+00'::timestamptz,
           purge_after = '2026-10-01 12:00:00+00'::timestamptz + interval '30 days'
     where id = %L::uuid $$,
  :'trash_transaction_case'),
  'exact 30-day Trash retention is accepted');
select throws_ok(format(
  $$ update public.transactions
       set purge_after = deleted_at + interval '29 days'
     where id = %L::uuid $$,
  :'trash_transaction_case'),
  '23514', null, 'shortened Trash retention is rejected');
select lives_ok(format(
  $$ update public.transactions set deleted_at = null, purge_after = null where id = %L::uuid $$,
  :'trash_transaction_case'),
  'restore clears Trash retention metadata');

-- Deleting a linked refund restores capacity; restoring it rechecks the aggregate.
select lives_ok(format(
  $$ update public.transactions
       set deleted_at = '2026-10-01 00:00:00+00'::timestamptz,
           deleted_by_user_id = %L::uuid,
           purge_after = '2026-10-31 00:00:00+00'::timestamptz
     where id = %L::uuid $$,
  :'user_a', :'trash_refund_case'),
  'moving linked refund to Trash restores refundable capacity');
select lives_ok(format(
  $$ insert into public.transactions(id, workspace_id, category_id, type, amount,
                                     transaction_date, linked_expense_id)
     values ('84000000-0000-4000-8000-000000000001'::uuid, %L::uuid, %L::uuid, 'refund', 400.01,
             (now() at time zone 'Asia/Kolkata')::date, %L::uuid) $$,
  :'household_abc', :'ordinary_category', '60000000-0000-4000-8000-000000000013'),
  'restored capacity can be used while the original refund is trashed');
select throws_ok(format(
  $$ update public.transactions
       set deleted_at = null, deleted_by_user_id = null, purge_after = null
     where id = %L::uuid $$,
  :'trash_refund_case'),
  '23514', null, 'restoring a linked refund above the remaining cap is rejected');
select lives_ok(
  $$ update public.transactions set amount = 400.00
       where id = '84000000-0000-4000-8000-000000000001'::uuid $$,
  'reduce the new refund to the exact remaining capacity');
select lives_ok(format(
  $$ update public.transactions
       set deleted_at = null, deleted_by_user_id = null, purge_after = null
     where id = %L::uuid $$,
  :'trash_refund_case'),
  'linked refund restores when aggregate equals the expense amount');

select throws_ok(format(
  $$ insert into public.export_jobs(background_job_id, workspace_id, data_types, recipient_user_id)
     values (%L::uuid, %L::uuid, array['transactions']::text[], %L::uuid) $$,
  :'backup_job_id', :'household_abc', :'user_a'),
  '23514', null, 'export detail cannot attach to a backup job');

-- Two-session refund races, Trash/restore RPC atomicity, purge races, and rollback
-- behavior and deferred parent-change errors are covered by separate-connection
-- scripts/specifications and require the
-- approved disposable database; this single transaction does not claim to verify them.

-- BUDGET-01: formula is applicable = base + rollover.
-- BUDGET-02: net eligible expenses = eligible expenses - eligible refunds.
-- BUDGET-03: available may be negative and equals applicable - net eligible expenses.
-- DELETE-01: soft delete sets deleted_at and purge_after consistently; restore before expiry succeeds.
-- DELETE-02: purge is idempotent across retries and removes linked child records per policy.
-- DELETE-03: tombstone prevents deleted workspace/account data from being resurrected from backup.
-- EXPORT-01: requester is authorized for workspace at creation and download time.
-- EXPORT-02: export contains only active eligible records from exactly one workspace.
-- EXPORT-03: removed member cannot download an existing export.
-- JOB-01: job status/detail type mismatch is rejected.

select * from finish();
rollback;

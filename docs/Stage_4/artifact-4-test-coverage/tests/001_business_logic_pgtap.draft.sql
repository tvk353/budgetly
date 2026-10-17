-- Budgetly Artifact 4: business-logic pgTAP outline
-- DRAFT ONLY. Not executed. Requires final schema/RPC reconciliation and disposable DB fixtures.
-- This file intentionally avoids pretending that not-yet-approved service functions exist.
-- Use one transaction and synthetic fixtures only.
--
-- Suggested fixture variables:
-- :user_a, :user_b, :user_c, :personal_a, :household_ab, :household_c,
-- :ordinary_category, :tracker_category, :expense_id, :fund_id, :tracker_id.
--
-- Run only after the schema and RLS artifacts are reconciled and approved.

begin;
select plan(5);

-- Amount and budget table constraints (adapt fixture IDs in harness).
select throws_ok(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values ('00000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date, -1, 0) $$,
  '23514',
  null,
  'negative base budget is rejected by check constraint'
);

select throws_ok(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values ('00000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date, 100, -1) $$,
  '23514',
  null,
  'negative rollover is rejected by check constraint'
);

select throws_ok(
  $$ insert into public.monthly_budgets(workspace_id, month_start, base_budget, rollover)
     values ('00000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date, 100, 0),
            ('00000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date, 200, 0) $$,
  '23505',
  null,
  'workspace cannot have duplicate budget for the same month'
);

select throws_ok(
  $$ insert into public.transactions(workspace_id, type, amount, transaction_date, category_id)
     values ('00000000-0000-0000-0000-000000000001', 'expense', 0, current_date,
             '00000000-0000-0000-0000-000000000002') $$,
  '23514',
  null,
  'zero transaction amount is rejected'
);

select throws_ok(
  $$ insert into public.transactions(workspace_id, type, amount, transaction_date, category_id,
                                     needs_category_correction)
     values ('00000000-0000-0000-0000-000000000001', 'expense', 10, current_date,
             null, false) $$,
  '23514',
  null,
  'missing category requires correction flag'
);

-- The following cases require real fixture IDs and final trigger/RPC names.
-- Replace placeholders with harness-owned fixtures; do not execute these comments as tests.

-- REFUND-01: insert linked refund within remaining expense amount succeeds.
-- REFUND-02: linked refund above remaining refundable amount is rejected atomically.
-- REFUND-03: two separate sessions attempt partial refunds concurrently; total active linked refunds never exceeds expense.
-- REFUND-04: refund and original expense must share workspace.
-- REFUND-05: deleting a linked refund restores refundable capacity without changing original expense.
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

-- Budgetly Stage 4 fixture bootstrap
-- DRAFT TEST HARNESS ONLY. This file does not apply schema migrations.
-- Run only against an explicitly approved, disposable local Supabase/PostgreSQL DB.
-- Requires the exact schema under test and five synthetic auth.users rows with the
-- UUIDs below, provisioned through a version-pinned local Auth test helper.
-- This file inserts only application fixtures; cleanup never deletes auth.users.
\set ON_ERROR_STOP on

DO $fixture_guard$
BEGIN
  IF current_setting('budgetly.disposable_test', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Refusing fixture setup without budgetly.disposable_test=on';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    RAISE EXCEPTION 'pgTAP is not enabled in this disposable test database';
  END IF;
END;
$fixture_guard$;

\ir fixture_cleanup.sql

DO $fixture_preflight$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Supabase auth.users is missing; install the approved disposable local test schema first';
  END IF;
  IF (SELECT count(*) FROM auth.users WHERE id IN (
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000003'::uuid,
      '10000000-0000-4000-8000-000000000004'::uuid,
      '10000000-0000-4000-8000-000000000005'::uuid
    )) <> 5 THEN
    RAISE EXCEPTION 'Create the five deterministic synthetic Auth users with the local test helper before fixture setup';
  END IF;
END;
$fixture_preflight$;

BEGIN;

INSERT INTO public.profiles (id, display_name) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Fixture A'),
  ('10000000-0000-4000-8000-000000000002', 'Fixture B'),
  ('10000000-0000-4000-8000-000000000003', 'Fixture C'),
  ('10000000-0000-4000-8000-000000000004', 'Fixture D'),
  ('10000000-0000-4000-8000-000000000005', 'Fixture E');

INSERT INTO public.workspaces (id, name, type, created_by) VALUES
  ('20000000-0000-4000-8000-000000000001', 'Fixture Household ABC', 'household', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Fixture Personal A', 'personal', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', 'Fixture Personal B', 'personal', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000004', 'Fixture Personal C', 'personal', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000005', 'Fixture Household E', 'household', '10000000-0000-4000-8000-000000000005');

INSERT INTO public.workspace_members (workspace_id, user_id, role, status, removed_at) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'active', null),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'member', 'active', null),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'member', 'active', null),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'member', 'removed', '2026-10-01 00:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner', 'active', null),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'owner', 'active', null),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'owner', 'active', null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'owner', 'active', null);

INSERT INTO public.category_scopes (id) VALUES
  ('30000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000005');

INSERT INTO public.category_scope_members (category_scope_id, user_id) VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005');

INSERT INTO public.workspace_category_scopes (workspace_id, category_scope_id) VALUES
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004');

INSERT INTO public.categories (id, category_scope_id, name, category_type, is_builtin, created_by_user_id) VALUES
  ('40000000-0000-4000-8000-000000000001', null, 'Fixture Built-in', 'ordinary', true, null),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Fixture Custom A', 'ordinary', false, '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Unlinked Scope Category', 'ordinary', false, '10000000-0000-4000-8000-000000000005'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'Fixture Ordinary', 'ordinary', false, '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'Fixture Tracker', 'tracker', false, '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000006', null, 'Fixture Built-in Tracker', 'tracker', true, null);

INSERT INTO public.labels (id, workspace_id, name, created_by_user_id) VALUES
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Fixture Label A', '10000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'Fixture Label E', '10000000-0000-4000-8000-000000000005');

INSERT INTO public.savings_funds (id, workspace_id, name) VALUES
  ('64000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Fixture Fund A'),
  ('64000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'Fixture Fund E');

INSERT INTO public.trackers (id, workspace_id, name) VALUES
  ('63000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Fixture Tracker A'),
  ('63000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'Fixture Tracker E');

INSERT INTO public.transactions (id, workspace_id, category_id, label_id, type, amount, transaction_date, description, linked_expense_id) VALUES
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', 'expense', 200.00, (now() at time zone 'Asia/Kolkata')::date, 'Fixture household transaction', null),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', null, 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Refund race expense', null),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', null, 'expense', 500.00, (now() at time zone 'Asia/Kolkata')::date, 'Refund update expense', null),
  ('60000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', null, 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Expense reduction race', null),
  ('60000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', null, 'expense', 20.00, (now() at time zone 'Asia/Kolkata')::date, 'Trash lifecycle case', null),
  ('60000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', null, 'expense', 75.00, (now() at time zone 'Asia/Kolkata')::date, 'Unrelated household transaction', null),
  ('60000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', null, 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Trash/refund concurrency case', null);

INSERT INTO public.transactions (id, workspace_id, category_id, type, amount, transaction_date, description, linked_expense_id) VALUES
  ('60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 100.00, (now() at time zone 'Asia/Kolkata')::date, 'Refund update row', '60000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 100.00, (now() at time zone 'Asia/Kolkata')::date, 'Other partial refund', '60000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 300.00, (now() at time zone 'Asia/Kolkata')::date, 'Refund reduction row A', '60000000-0000-4000-8000-000000000006'),
  ('60000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 300.00, (now() at time zone 'Asia/Kolkata')::date, 'Refund reduction row B', '60000000-0000-4000-8000-000000000006'),
  ('60000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 600.00, (now() at time zone 'Asia/Kolkata')::date, 'Trash/refund concurrency child', '60000000-0000-4000-8000-000000000013');

INSERT INTO public.transactions (id, workspace_id, category_id, type, amount, transaction_date, description, linked_expense_id, deleted_at, deleted_by_user_id, purge_after) VALUES
  ('60000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Restore concurrency parent', null, '2026-10-01 00:00:00+00', '10000000-0000-4000-8000-000000000001', '2026-10-31 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 600.00, (now() at time zone 'Asia/Kolkata')::date, 'Restore concurrency child', '60000000-0000-4000-8000-000000000011', '2026-10-01 00:00:00+00', '10000000-0000-4000-8000-000000000001', '2026-10-31 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Purge contract parent', null, '2026-10-01 00:00:00+00', '10000000-0000-4000-8000-000000000001', '2026-10-31 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'refund', 600.00, (now() at time zone 'Asia/Kolkata')::date, 'Purge contract child', '60000000-0000-4000-8000-000000000015', '2026-10-01 00:00:00+00', '10000000-0000-4000-8000-000000000001', '2026-10-31 00:00:00+00');

INSERT INTO public.savings_transactions (id, fund_id, type, amount, transaction_date, description) VALUES
  ('61000000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001', 'deposit', 100.00, (now() at time zone 'Asia/Kolkata')::date, 'Fixture savings A'),
  ('61000000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000002', 'deposit', 200.00, (now() at time zone 'Asia/Kolkata')::date, 'Fixture savings E');

INSERT INTO public.tracker_transactions (id, workspace_id, tracker_id, category_id, type, amount, transaction_date, description, linked_expense_id) VALUES
  ('62000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'expense', 200.00, (now() at time zone 'Asia/Kolkata')::date, 'Fixture tracker transaction', null),
  ('62000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Tracker refund race expense', null),
  ('62000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', '63000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000006', 'expense', 50.00, (now() at time zone 'Asia/Kolkata')::date, 'Unrelated tracker transaction', null),
  ('62000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'expense', 1000.00, (now() at time zone 'Asia/Kolkata')::date, 'Tracker concurrent refund expense', null);

INSERT INTO public.tracker_transactions (id, workspace_id, tracker_id, category_id, type, amount, transaction_date, description, linked_expense_id) VALUES
  ('62000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'refund', 400.00, (now() at time zone 'Asia/Kolkata')::date, 'Tracker refund update row', '62000000-0000-4000-8000-000000000002'),
  ('62000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'refund', 600.00, (now() at time zone 'Asia/Kolkata')::date, 'Other tracker partial refund', '62000000-0000-4000-8000-000000000002');

INSERT INTO public.monthly_budgets (id, workspace_id, month_start, base_budget, rollover) VALUES
  ('66000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', date_trunc('month', now() at time zone 'Asia/Kolkata')::date, 0, 0);

INSERT INTO public.workspace_invitations (id, workspace_id, invited_by_user_id, invitee_email, token_hash, expires_at) VALUES
  ('65000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'fixture-invite@example.invalid', repeat('0', 64), now() + interval '7 days');

INSERT INTO public.background_jobs (id, workspace_id, requested_by_user_id, job_type) VALUES
  ('70000000-0000-4000-8000-000000000001', null, '10000000-0000-4000-8000-000000000001', 'backup'),
  ('70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'export'),
  ('70000000-0000-4000-8000-000000000003', null, '10000000-0000-4000-8000-000000000001', 'cleanup');

INSERT INTO public.backup_runs (id, background_job_id, destination) VALUES
  ('72000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'fixture-local');

INSERT INTO public.export_jobs (id, background_job_id, workspace_id, requested_by_user_id, data_types, recipient_user_id) VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', ARRAY['transactions']::text[], '10000000-0000-4000-8000-000000000001');

COMMIT;

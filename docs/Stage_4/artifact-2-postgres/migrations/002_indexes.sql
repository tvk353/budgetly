-- Budgetly / Artifact 2 / Migration 002
-- DRAFT ONLY. Do not execute until approved.

-- Built-in names are globally reserved; custom names are unique only within an authorized user-group scope.
create unique index categories_custom_name_scope_uq
    on public.categories (category_scope_id, lower(btrim(name)))
    where is_builtin = false;

create index category_scope_members_user_idx
    on public.category_scope_members (user_id, category_scope_id);

create index workspace_category_scopes_scope_idx
    on public.workspace_category_scopes (category_scope_id, workspace_id);

create unique index idempotency_records_scope_key_uq
    on public.idempotency_records (user_id, route_key, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), operation_key);

create index idempotency_records_expiry_idx
    on public.idempotency_records (expires_at)
    where expires_at is not null;

create index categories_type_archive_idx
    on public.categories (category_type, archived_at, lower(name));

create unique index workspace_members_one_active_owner_uq
    on public.workspace_members (workspace_id)
    where role = 'owner' and status = 'active';

create unique index workspace_members_active_user_workspace_uq
    on public.workspace_members (workspace_id, user_id)
    where status = 'active';

create unique index workspace_invitations_live_email_uq
    on public.workspace_invitations (workspace_id, lower(btrim(invitee_email)))
    where revoked_at is null and joined_at is null;

create index workspace_invitations_expiry_idx
    on public.workspace_invitations (expires_at)
    where revoked_at is null and joined_at is null;

create unique index savings_funds_active_name_uq
    on public.savings_funds (workspace_id, lower(btrim(name)))
    where deleted_at is null;

create unique index trackers_active_name_uq
    on public.trackers (workspace_id, lower(btrim(name)))
    where deleted_at is null;

create index transactions_workspace_date_idx
    on public.transactions (workspace_id, transaction_date desc, created_at desc)
    where deleted_at is null;

create index transactions_workspace_category_date_idx
    on public.transactions (workspace_id, category_id, transaction_date desc)
    where deleted_at is null;

create index transactions_workspace_type_date_idx
    on public.transactions (workspace_id, type, transaction_date desc)
    where deleted_at is null;

create index transactions_linked_expense_idx
    on public.transactions (workspace_id, linked_expense_id)
    where linked_expense_id is not null;

create index transactions_trash_idx
    on public.transactions (workspace_id, deleted_at desc, purge_after)
    where deleted_at is not null;

create index monthly_budgets_workspace_month_idx
    on public.monthly_budgets (workspace_id, month_start desc);

create index savings_funds_workspace_idx
    on public.savings_funds (workspace_id, created_at desc);

create index savings_transactions_fund_date_idx
    on public.savings_transactions (fund_id, transaction_date desc, created_at desc)
    where deleted_at is null;

create index savings_transactions_trash_idx
    on public.savings_transactions (deleted_at desc, purge_after)
    where deleted_at is not null;

create index trackers_workspace_status_idx
    on public.trackers (workspace_id, status, is_hidden)
    where deleted_at is null;

create index tracker_transactions_workspace_date_idx
    on public.tracker_transactions (workspace_id, transaction_date desc, created_at desc)
    where deleted_at is null;

create index tracker_transactions_tracker_date_idx
    on public.tracker_transactions (tracker_id, transaction_date desc, created_at desc)
    where deleted_at is null;

create index tracker_transactions_workspace_category_date_idx
    on public.tracker_transactions (workspace_id, category_id, transaction_date desc)
    where deleted_at is null;

create index tracker_transactions_linked_expense_idx
    on public.tracker_transactions (workspace_id, tracker_id, linked_expense_id)
    where linked_expense_id is not null;

create index tracker_transactions_trash_idx
    on public.tracker_transactions (workspace_id, deleted_at desc, purge_after)
    where deleted_at is not null;

create index audit_logs_workspace_time_idx
    on public.audit_logs (workspace_id, occurred_at desc);

create index audit_logs_target_idx
    on public.audit_logs (target_type, target_id, occurred_at desc);

create index background_jobs_ready_idx
    on public.background_jobs (scheduled_at, created_at)
    where status = 'pending';

create index background_jobs_workspace_idx
    on public.background_jobs (workspace_id, created_at desc);

create index export_jobs_workspace_created_idx
    on public.export_jobs (workspace_id, created_at desc);

create index backup_runs_created_idx
    on public.backup_runs (created_at desc);

create index deletion_tombstones_due_idx
    on public.deletion_tombstones (purge_after, created_at)
    where status in ('pending', 'failed');

create index account_deletion_requests_user_status_idx
    on public.account_deletion_requests (user_id, status, requested_at desc);

create index workspace_deletion_requests_workspace_status_idx
    on public.workspace_deletion_requests (workspace_id, status, requested_at desc);

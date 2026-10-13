-- Budgetly / Artifact 2 / Migration 001
-- DRAFT ONLY. Do not execute until this artifact and subsequent RLS design are approved.
-- Requires Supabase's managed auth.users table.

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 80),
    type text not null check (type in ('personal', 'household')),
    created_by uuid references public.profiles(id) on delete set null,
    deleted_at timestamptz,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((deleted_at is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.workspace_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role text not null check (role in ('owner', 'member')),
    status text not null default 'active' check (status in ('active', 'removed')),
    joined_at timestamptz not null default now(),
    removed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, user_id),
    check ((status = 'active' and removed_at is null) or
           (status = 'removed' and removed_at is not null))
);

create table public.workspace_invitations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    invited_by_user_id uuid references public.profiles(id) on delete set null,
    invitee_email text not null check (char_length(btrim(invitee_email)) between 3 and 320),
    token_hash text not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    joined_at timestamptz,
    created_at timestamptz not null default now(),
    check (expires_at > created_at),
    check (not (revoked_at is not null and joined_at is not null))
);

create table public.account_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'pending'
        check (status in ('pending', 'recoverable', 'cancelled', 'purging', 'completed', 'failed')),
    requested_at timestamptz not null default now(),
    recover_until timestamptz not null,
    completed_at timestamptz,
    requested_by_user_id uuid references public.profiles(id) on delete set null,
    failure_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (recover_until >= requested_at)
);

create table public.workspace_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    requested_by_user_id uuid references public.profiles(id) on delete set null,
    status text not null default 'pending'
        check (status in ('pending', 'recoverable', 'cancelled', 'purging', 'completed', 'failed')),
    requested_at timestamptz not null default now(),
    recover_until timestamptz not null,
    completed_at timestamptz,
    failure_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (recover_until >= requested_at)
);

create table public.category_scopes (
    id uuid primary key default gen_random_uuid(),
    scope_type text not null default 'user_group' check (scope_type = 'user_group'),
    created_at timestamptz not null default now()
);

create table public.category_scope_members (
    category_scope_id uuid not null references public.category_scopes(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (category_scope_id, user_id)
);

-- A personal workspace links to its owner's scope; a household links to every active member's scope.
-- This avoids category-row merges and historical reference rewrites when household membership changes.
create table public.workspace_category_scopes (
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    category_scope_id uuid not null references public.category_scopes(id) on delete restrict,
    created_at timestamptz not null default now(),
    primary key (workspace_id, category_scope_id)
);

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    category_scope_id uuid references public.category_scopes(id) on delete restrict,
    name text not null check (char_length(btrim(name)) between 1 and 30),
    category_type text not null check (category_type in ('ordinary', 'tracker')),
    is_builtin boolean not null default false,
    created_by_user_id uuid references public.profiles(id) on delete set null,
    description text check (description is null or char_length(description) <= 200),
    color text,
    icon text,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (name = btrim(name)),
    check (is_builtin = false or (created_by_user_id is null and category_scope_id is null)),
    check (is_builtin = true or category_scope_id is not null)
);

create table public.workspace_category_visibility (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    is_hidden boolean not null default false,
    updated_at timestamptz not null default now(),
    unique (workspace_id, category_id)
);

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    category_id uuid references public.categories(id) on delete set null,
    needs_category_correction boolean not null default false,
    linked_expense_id uuid,
    type text not null check (type in ('expense', 'refund')),
    amount numeric(14,2) not null check (amount > 0),
    transaction_date date not null,
    description text check (description is null or char_length(description) <= 50),
    notes text check (notes is null or char_length(notes) <= 500),
    deleted_at timestamptz,
    deleted_by_user_id uuid references public.profiles(id) on delete set null,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, id),
    foreign key (workspace_id, linked_expense_id)
        references public.transactions(workspace_id, id) on delete set null (linked_expense_id),
    check ((category_id is null and needs_category_correction) or
           (category_id is not null and not needs_category_correction)),
    check ((type = 'expense' and linked_expense_id is null) or type = 'refund'),
    check ((deleted_at is null and deleted_by_user_id is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.monthly_budgets (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    month_start date not null check (extract(day from month_start) = 1),
    base_budget numeric(14,2) not null check (base_budget >= 0),
    rollover numeric(14,2) not null default 0 check (rollover >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, month_start)
);

create table public.savings_funds (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 50),
    deleted_at timestamptz,
    deleted_by_user_id uuid references public.profiles(id) on delete set null,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, id),
    check (name = btrim(name)),
    check ((deleted_at is null and deleted_by_user_id is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.savings_transactions (
    id uuid primary key default gen_random_uuid(),
    fund_id uuid not null references public.savings_funds(id) on delete cascade,
    type text not null check (type in ('deposit', 'withdrawal')),
    amount numeric(14,2) not null check (amount > 0),
    transaction_date date not null,
    description text check (description is null or char_length(description) <= 50),
    notes text check (notes is null or char_length(notes) <= 500),
    deleted_at timestamptz,
    deleted_by_user_id uuid references public.profiles(id) on delete set null,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((deleted_at is null and deleted_by_user_id is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.trackers (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 50),
    status text not null default 'active' check (status in ('active', 'ended')),
    is_hidden boolean not null default false,
    ended_at timestamptz,
    deleted_at timestamptz,
    deleted_by_user_id uuid references public.profiles(id) on delete set null,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, id),
    check (name = btrim(name)),
    check ((status = 'active' and ended_at is null) or (status = 'ended' and ended_at is not null)),
    check ((deleted_at is null and deleted_by_user_id is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.tracker_transactions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    tracker_id uuid not null,
    category_id uuid references public.categories(id) on delete set null,
    needs_category_correction boolean not null default false,
    linked_expense_id uuid,
    type text not null check (type in ('expense', 'refund')),
    amount numeric(14,2) not null check (amount > 0),
    transaction_date date not null,
    description text check (description is null or char_length(description) <= 50),
    notes text check (notes is null or char_length(notes) <= 500),
    deleted_at timestamptz,
    deleted_by_user_id uuid references public.profiles(id) on delete set null,
    purge_after timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, tracker_id, id),
    foreign key (workspace_id, tracker_id)
        references public.trackers(workspace_id, id) on delete cascade,
    foreign key (workspace_id, tracker_id, linked_expense_id)
        references public.tracker_transactions(workspace_id, tracker_id, id)
        on delete set null (linked_expense_id),
    check ((category_id is null and needs_category_correction) or
           (category_id is not null and not needs_category_correction)),
    check ((type = 'expense' and linked_expense_id is null) or type = 'refund'),
    check ((deleted_at is null and deleted_by_user_id is null and purge_after is null) or
           (deleted_at is not null and purge_after is not null and purge_after >= deleted_at))
);

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.workspaces(id) on delete set null,
    actor_user_id uuid references public.profiles(id) on delete set null,
    action text not null check (char_length(btrim(action)) between 1 and 80),
    target_type text not null check (char_length(btrim(target_type)) between 1 and 80),
    target_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default now()
);

create table public.background_jobs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.workspaces(id) on delete set null,
    requested_by_user_id uuid references public.profiles(id) on delete set null,
    job_type text not null check (job_type in
        ('export', 'backup', 'annual_export', 'annual_backup', 'cleanup')),
    status text not null default 'pending' check (status in
        ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempt_count integer not null default 0 check (attempt_count >= 0),
    max_attempts integer not null default 5 check (max_attempts between 1 and 20),
    scheduled_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    locked_at timestamptz,
    locked_by text,
    last_error_code text,
    safe_error_metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((status = 'running' and locked_at is not null) or status <> 'running'),
    check ((status in ('completed', 'failed', 'cancelled') and finished_at is not null)
        or (status in ('pending', 'running') and finished_at is null))
);

create table public.export_jobs (
    id uuid primary key default gen_random_uuid(),
    background_job_id uuid not null unique references public.background_jobs(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    requested_by_user_id uuid references public.profiles(id) on delete set null,
    format text not null default 'csv' check (format = 'csv'),
    data_types text[] not null check (cardinality(data_types) > 0),
    from_date date,
    to_date date,
    output_location text,
    expires_at timestamptz,
    recipient_user_id uuid not null references public.profiles(id) on delete cascade,
    drive_file_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((from_date is null and to_date is null) or
           (from_date is not null and to_date is not null and from_date <= to_date)),
    check (data_types <@ array['transactions','budgets','savings','trackers','categories']::text[]),
    check (output_location is not null or expires_at is null)
);

create table public.backup_runs (
    id uuid primary key default gen_random_uuid(),
    background_job_id uuid not null unique references public.background_jobs(id) on delete cascade,
    destination text not null check (char_length(btrim(destination)) between 1 and 120),
    checksum text,
    manifest jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table public.idempotency_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    operation_key text not null check (char_length(operation_key) between 8 and 128),
    route_key text not null check (char_length(btrim(route_key)) between 1 and 200),
    workspace_id uuid references public.workspaces(id) on delete set null,
    request_fingerprint text not null,
    response_status integer,
    response_metadata jsonb,
    resource_id uuid,
    state text not null default 'pending' check (state in ('pending', 'completed', 'failed')),
    created_at timestamptz not null default now(),
    terminal_at timestamptz,
    expires_at timestamptz,
    updated_at timestamptz not null default now(),
    check ((state = 'pending' and terminal_at is null and expires_at is null) or
           (state <> 'pending' and terminal_at is not null and expires_at >= terminal_at + interval '24 hours'))
);

create table public.deletion_tombstones (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid,
    subject_user_id uuid,
    target_type text not null check (target_type in ('account', 'workspace', 'purge')),
    target_id uuid not null,
    operation_key text not null,
    status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
    purge_after timestamptz,
    completed_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (target_type, target_id, operation_key),
    check ((status = 'completed' and completed_at is not null) or
           (status <> 'completed' and completed_at is null))
);

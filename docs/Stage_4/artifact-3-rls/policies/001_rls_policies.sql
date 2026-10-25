-- Budgetly / Artifact 3 / Supabase RLS policies
-- DRAFT ONLY. DO NOT EXECUTE until Artifacts 2 and 3 are approved and reconciled.
-- Intended for Supabase Postgres with roles anon, authenticated, service_role,
-- auth.uid(), and the public tables from Artifact 2.
--
-- This file does not apply migrations or connect to a database.

begin;

-- These defaults apply only to the role executing this file. Apply equivalent
-- defaults for every approved object-creating role. PostgreSQL does not enable
-- RLS automatically for future tables; every table-creating migration must do so.
alter default privileges revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Membership helper functions.
-- SECURITY DEFINER avoids recursive policy evaluation on workspace_members.
-- Fixed search_path and schema-qualified references are intentional.
-- ---------------------------------------------------------------------------

create or replace function public.is_active_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and w.deleted_at is null
  );
$function$;

create or replace function public.is_active_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'owner'
      and w.deleted_at is null
  );
$function$;

create or replace function public.shares_active_workspace_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    join public.workspaces w on w.id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_other_user_id
      and mine.status = 'active'
      and theirs.status = 'active'
      and w.deleted_at is null
  );
$function$;

revoke all on function public.is_active_workspace_member(uuid) from public, anon;
revoke all on function public.is_active_workspace_owner(uuid) from public, anon;
create or replace function public.is_category_scope_member(p_category_scope_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.category_scope_members m
    where m.category_scope_id = p_category_scope_id
      and m.user_id = (select auth.uid())
  ) or exists (
    select 1
    from public.workspace_category_scopes wcs
    join public.workspace_members m on m.workspace_id = wcs.workspace_id
    join public.workspaces w on w.id = wcs.workspace_id
    where wcs.category_scope_id = p_category_scope_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and w.deleted_at is null
  );
$function$;

revoke all on function public.shares_active_workspace_with(uuid) from public, anon;
revoke all on function public.shares_active_workspace_with(uuid) from authenticated, service_role;
revoke all on function public.is_category_scope_member(uuid) from public, anon;
grant execute on function public.is_active_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.is_active_workspace_owner(uuid) to authenticated, service_role;
grant execute on function public.is_category_scope_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS enablement. FORCE RLS is deliberately not enabled in this draft because
-- trusted migration/service execution patterns must be decided per deployment.
-- service_role normally bypasses RLS in Supabase; never expose its key.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.workspace_deletion_requests enable row level security;
alter table public.category_scopes enable row level security;
alter table public.category_scope_members enable row level security;
alter table public.workspace_category_scopes enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.categories enable row level security;
alter table public.workspace_category_visibility enable row level security;
alter table public.labels enable row level security;
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.savings_funds enable row level security;
alter table public.savings_transactions enable row level security;
alter table public.trackers enable row level security;
alter table public.tracker_transactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.background_jobs enable row level security;
alter table public.export_jobs enable row level security;
alter table public.backup_runs enable row level security;
alter table public.deletion_tombstones enable row level security;

-- Default deny: revoke table privileges first; grants below are deliberate.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated, service_role;

-- Profiles: users may read/update their own profile only.
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Workspaces: active members can read. Client-side creation is denied here;
-- workspace + initial owner membership must be created via a transactional RPC.
grant select on public.workspaces to authenticated;
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (public.is_active_workspace_member(id));

-- Memberships: active members can inspect their workspace membership roster.
-- Membership insert/update/delete is denied to direct clients; trusted RPCs only.
grant select on public.workspace_members to authenticated;
create policy workspace_members_select_member on public.workspace_members
  for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- Expose invitation roster fields only. The bearer-token hash is never
-- selectable by ordinary clients; mutations remain server/RPC-only.
grant select (id, workspace_id, invited_by_user_id, invitee_email, expires_at,
              revoked_at, joined_at, created_at)
  on public.workspace_invitations to authenticated;
create policy workspace_invitations_select_member on public.workspace_invitations
  for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- Deletion requests: users can read their own account request. Workspace
-- deletion requests visible only to active members. Lifecycle mutations are
-- server/RPC only; direct inserts are intentionally not granted.
grant select on public.account_deletion_requests to authenticated;
create policy account_deletion_requests_select_self on public.account_deletion_requests
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.workspace_deletion_requests to authenticated;
create policy workspace_deletion_requests_select_member on public.workspace_deletion_requests
  for select to authenticated
  using (public.is_active_workspace_member(workspace_id));

-- Category scopes: only authorized scope members can read custom categories.
-- Scope membership and workspace-scope links are server/RPC-only and transactional; no scope merge occurs.
grant select on public.category_scopes, public.category_scope_members to authenticated;
create policy category_scopes_select_member on public.category_scopes
  for select to authenticated using (public.is_category_scope_member(id));
create policy category_scope_members_select_scope on public.category_scope_members
  for select to authenticated using (public.is_category_scope_member(category_scope_id));
grant select on public.workspace_category_scopes to authenticated;
create policy workspace_category_scopes_select_member on public.workspace_category_scopes
  for select to authenticated using (public.is_active_workspace_member(workspace_id));

-- Built-ins are globally readable; custom categories are readable only within their scope.
-- Custom category writes are routed through a trusted endpoint/RPC so creator, scope membership,
-- uniqueness, and household-shared mutations are checked atomically.
grant select on public.categories to authenticated;
create policy categories_select_visible on public.categories
  for select to authenticated using (
    is_builtin or public.is_category_scope_member(category_scope_id)
  );
-- No direct INSERT/UPDATE/DELETE grants for categories. Use narrow server/RPC operations.

-- Idempotency rows are server-only; clients never read or mutate raw replay metadata.
-- No authenticated grants or policies are intentionally created for idempotency_records.

-- Category visibility: household owner only for direct client writes. Keep
-- workspace/category identity and timestamps immutable to ordinary clients.
grant select on public.workspace_category_visibility to authenticated;
grant insert (workspace_id, category_id, is_hidden)
  on public.workspace_category_visibility to authenticated;
grant update (is_hidden) on public.workspace_category_visibility to authenticated;
grant delete on public.workspace_category_visibility to authenticated;
create policy category_visibility_select_member on public.workspace_category_visibility
  for select to authenticated
  using (public.is_active_workspace_member(workspace_id));
create policy category_visibility_insert_owner on public.workspace_category_visibility
  for insert to authenticated
  with check (public.is_active_workspace_owner(workspace_id));
create policy category_visibility_update_owner on public.workspace_category_visibility
  for update to authenticated
  using (public.is_active_workspace_owner(workspace_id))
  with check (public.is_active_workspace_owner(workspace_id));
create policy category_visibility_delete_owner on public.workspace_category_visibility
  for delete to authenticated
  using (public.is_active_workspace_owner(workspace_id));

-- Labels: reusable across categories, scoped to the active workspace.
-- Deletion and retention metadata are trusted lifecycle operations.
grant select on public.labels to authenticated;
grant insert (workspace_id, name) on public.labels to authenticated;
grant update (name) on public.labels to authenticated;
create policy labels_select_member on public.labels
  for select to authenticated
  using (deleted_at is null and public.is_active_workspace_member(workspace_id));
create policy labels_insert_member on public.labels
  for insert to authenticated with check (public.is_active_workspace_member(workspace_id));
create policy labels_update_member on public.labels
  for update to authenticated
  using (deleted_at is null and public.is_active_workspace_member(workspace_id))
  with check (deleted_at is null and public.is_active_workspace_member(workspace_id));

-- Ordinary transactions: all active members can manage household finances.
-- Restore, Trash, and purge metadata are trusted operations. Clients cannot
-- hard-delete, reparent, relink, or edit a trashed transaction directly.
grant select on public.transactions to authenticated;
grant insert (workspace_id, category_id, label_id, linked_expense_id, type,
              amount, transaction_date, description, notes)
  on public.transactions to authenticated;
grant update (amount, transaction_date, category_id, label_id, description, notes)
  on public.transactions to authenticated;
create policy transactions_select_member on public.transactions
  for select to authenticated
  using (public.is_active_workspace_member(workspace_id));
create policy transactions_insert_member on public.transactions
  for insert to authenticated
  with check (public.is_active_workspace_member(workspace_id));
create policy transactions_update_member on public.transactions
  for update to authenticated
  using (deleted_at is null and public.is_active_workspace_member(workspace_id))
  with check (deleted_at is null and public.is_active_workspace_member(workspace_id));

-- Budgets: all active members may manage the workspace budget.
-- Workspace/month identity is immutable. New rows are constrained by the
-- current-IST-month insert trigger in Artifact 2.
grant select on public.monthly_budgets to authenticated;
grant insert (workspace_id, month_start, base_budget, rollover)
  on public.monthly_budgets to authenticated;
grant update (base_budget, rollover) on public.monthly_budgets to authenticated;
create policy monthly_budgets_select_member on public.monthly_budgets
  for select to authenticated using (public.is_active_workspace_member(workspace_id));
create policy monthly_budgets_insert_member on public.monthly_budgets
  for insert to authenticated with check (public.is_active_workspace_member(workspace_id));
create policy monthly_budgets_update_member on public.monthly_budgets
  for update to authenticated
  using (public.is_active_workspace_member(workspace_id))
  with check (public.is_active_workspace_member(workspace_id));

-- Savings funds: active members can create and rename funds.
-- Fund deletion/restoration and retention metadata are trusted operations.
grant select on public.savings_funds to authenticated;
grant insert (workspace_id, name) on public.savings_funds to authenticated;
grant update (name) on public.savings_funds to authenticated;
create policy savings_funds_select_member on public.savings_funds
  for select to authenticated using (public.is_active_workspace_member(workspace_id));
create policy savings_funds_insert_member on public.savings_funds
  for insert to authenticated with check (public.is_active_workspace_member(workspace_id));
create policy savings_funds_update_member on public.savings_funds
  for update to authenticated
  using (deleted_at is null and public.is_active_workspace_member(workspace_id))
  with check (deleted_at is null and public.is_active_workspace_member(workspace_id));

-- Savings transactions have no workspace_id; scope through their fund.
-- Updates, Trash, and purge are trusted operations; only active funds accept writes.
grant select on public.savings_transactions to authenticated;
grant insert (fund_id, type, amount, transaction_date, description, notes)
  on public.savings_transactions to authenticated;
create policy savings_transactions_select_member on public.savings_transactions
  for select to authenticated
  using (exists (
    select 1 from public.savings_funds f
    where f.id = fund_id
      and public.is_active_workspace_member(f.workspace_id)
  ));
create policy savings_transactions_insert_member on public.savings_transactions
  for insert to authenticated
  with check (exists (
    select 1 from public.savings_funds f
    where f.id = fund_id
      and f.deleted_at is null
      and public.is_active_workspace_member(f.workspace_id)
  ));

-- Trackers: active members can create, rename, and hide/show trackers.
-- Reopen/end/delete state transitions are trusted operations.
grant select on public.trackers to authenticated;
grant insert (workspace_id, name) on public.trackers to authenticated;
grant update (name, is_hidden) on public.trackers to authenticated;
create policy trackers_select_member on public.trackers
  for select to authenticated using (public.is_active_workspace_member(workspace_id));
create policy trackers_insert_member on public.trackers
  for insert to authenticated with check (public.is_active_workspace_member(workspace_id));
create policy trackers_update_member on public.trackers
  for update to authenticated
  using (deleted_at is null and public.is_active_workspace_member(workspace_id))
  with check (deleted_at is null and public.is_active_workspace_member(workspace_id));

-- Tracker transactions: RLS scopes directly by workspace_id; composite FK
-- enforces tracker/workspace consistency.
-- Edit, Trash, restore, and purge transitions use trusted operations.
grant select on public.tracker_transactions to authenticated;
grant insert (workspace_id, tracker_id, category_id, linked_expense_id,
              type, amount, transaction_date, description, notes)
  on public.tracker_transactions to authenticated;
create policy tracker_transactions_select_member on public.tracker_transactions
  for select to authenticated using (public.is_active_workspace_member(workspace_id));
create policy tracker_transactions_insert_member on public.tracker_transactions
  for insert to authenticated with check (public.is_active_workspace_member(workspace_id));

-- Audit log: read-only for workspace members; client cannot forge events.
grant select on public.audit_logs to authenticated;
create policy audit_logs_select_member on public.audit_logs
  for select to authenticated
  using (workspace_id is not null and public.is_active_workspace_member(workspace_id));
-- No authenticated INSERT/UPDATE/DELETE policy or grants.

-- Operational tables are inaccessible to authenticated clients. Trusted server
-- code using service_role owns queue claims, retries, backups, and tombstones.
-- Export details are requester-readable only through a secure RPC in a later
-- implementation; no direct table grant here avoids leaking output_location.
-- Intentionally no grants/policies for background_jobs, export_jobs, backup_runs,
-- deletion_tombstones to anon/authenticated.

commit;


-- Reconciled category-scope draft: is_category_scope_member allows a direct scope
-- member or an active member of a workspace linked to that scope. Mapping and scope
-- membership writes remain trusted, transactional operations. This policy draft has
-- not been executed or validated against a database.

-- Budgetly / Artifact 2 / Migration 003
-- DRAFT ONLY. Integrity triggers do not replace authorization/RLS.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','account_deletion_requests',
    'workspace_deletion_requests','categories','workspace_category_visibility','idempotency_records',
    'transactions','monthly_budgets','savings_funds','savings_transactions',
    'trackers','tracker_transactions','background_jobs','export_jobs','deletion_tombstones'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_'||t||'_updated_at', t);
  end loop;
end;
$$;


-- Business dates are validated at write time in Asia/Kolkata. Avoid a time-dependent CHECK
-- constraint, which would not be re-evaluated as the calendar date changes.
create or replace function public.guard_business_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.transaction_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception using errcode = '23514', message = 'Transaction date cannot be in the future';
  end if;
  return new;
end;
$$;

create trigger trg_transactions_business_date
before insert or update of transaction_date on public.transactions
for each row execute function public.guard_business_date();

create trigger trg_savings_transactions_business_date
before insert or update of transaction_date on public.savings_transactions
for each row execute function public.guard_business_date();

create trigger trg_tracker_transactions_business_date
before insert or update of transaction_date on public.tracker_transactions
for each row execute function public.guard_business_date();

-- Custom categories cannot collide with built-in names, even across category types.
create or replace function public.guard_category_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  if not new.is_builtin then
    if new.category_scope_id is null then
      raise exception using errcode = '23514', message = 'Custom categories require a category scope';
    end if;
    if new.created_by_user_id is not null and not exists (select 1 from public.category_scope_members m where m.category_scope_id = new.category_scope_id and m.user_id = new.created_by_user_id) then
      raise exception using errcode = '23514', message = 'Category creator must belong to its category scope';
    end if;
    if exists (
      select 1 from public.categories c
      where c.is_builtin
        and lower(btrim(c.name)) = lower(new.name)
        and c.id is distinct from new.id
    ) then
      raise exception using errcode = '23505', message = 'Custom category name conflicts with a built-in category';
    end if;
  else
    if exists (
      select 1 from public.categories c
      where not c.is_builtin
        and lower(btrim(c.name)) = lower(new.name)
        and c.id is distinct from new.id
    ) then
      raise exception using errcode = '23505', message = 'Built-in category name conflicts with an existing custom category';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_categories_guard_name
before insert or update of name, is_builtin on public.categories
for each row execute function public.guard_category_name();

-- Built-in visibility overrides are allowed only for household workspaces and built-in categories.
create or replace function public.guard_category_visibility()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workspaces w
    where w.id = new.workspace_id and w.type = 'household' and w.deleted_at is null
  ) then
    raise exception using errcode = '23514', message = 'Category visibility can only be set for an active household workspace';
  end if;
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.is_builtin
  ) then
    raise exception using errcode = '23514', message = 'Visibility overrides are only for built-in categories';
  end if;
  return new;
end;
$$;

create trigger trg_workspace_category_visibility_guard
before insert or update on public.workspace_category_visibility
for each row execute function public.guard_category_visibility();

-- Category type compatibility and category-correction flag consistency for ordinary transactions.
create or replace function public.guard_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat_type text;
  cat_archived timestamptz;
begin
  if new.category_id is null then
    if not new.needs_category_correction then
      raise exception using errcode = '23514', message = 'A NULL category requires needs_category_correction=true';
    end if;
  else
    if new.needs_category_correction then
      raise exception using errcode = '23514', message = 'A categorized transaction cannot require category correction';
    end if;
    select c.category_type, c.archived_at into cat_type, cat_archived
      from public.categories c where c.id = new.category_id;
    if not found then
      raise exception using errcode = '23503', message = 'Category does not exist';
    end if;
    if cat_type <> 'ordinary' then
      raise exception using errcode = '23514', message = 'Transaction requires an ordinary category';
    end if;
    if cat_archived is not null and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) then
      raise exception using errcode = '23514', message = 'Archived category cannot be newly assigned';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_transactions_category_guard
before insert or update of category_id, needs_category_correction on public.transactions
for each row execute function public.guard_transaction_category();

create or replace function public.guard_tracker_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat_type text;
  cat_archived timestamptz;
begin
  if new.category_id is null then
    if not new.needs_category_correction then
      raise exception using errcode = '23514', message = 'A NULL category requires needs_category_correction=true';
    end if;
  else
    if new.needs_category_correction then
      raise exception using errcode = '23514', message = 'A categorized tracker transaction cannot require category correction';
    end if;
    select c.category_type, c.archived_at into cat_type, cat_archived
      from public.categories c where c.id = new.category_id;
    if not found then
      raise exception using errcode = '23503', message = 'Category does not exist';
    end if;
    if cat_type <> 'tracker' then
      raise exception using errcode = '23514', message = 'Tracker transaction requires a tracker category';
    end if;
    if cat_archived is not null and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) then
      raise exception using errcode = '23514', message = 'Archived category cannot be newly assigned';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_tracker_transactions_category_guard
before insert or update of category_id, needs_category_correction on public.tracker_transactions
for each row execute function public.guard_tracker_transaction_category();

-- Membership invariants are deferred so workspace creation and initial membership can happen in one transaction.
create or replace function public.assert_workspace_membership_invariants(p_workspace_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  ws_type text;
  active_count integer;
  owner_count integer;
begin
  select w.type into ws_type from public.workspaces w where w.id = p_workspace_id;
  if not found then
    return;
  end if;
  select count(*) filter (where m.status = 'active'),
         count(*) filter (where m.status = 'active' and m.role = 'owner')
    into active_count, owner_count
    from public.workspace_members m
   where m.workspace_id = p_workspace_id;

  if owner_count <> 1 then
    raise exception using errcode = '23514', message = 'Every workspace must have exactly one active owner';
  end if;
  if ws_type = 'personal' and (active_count <> 1 or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = p_workspace_id and m.status = 'active' and m.role <> 'owner'
  )) then
    raise exception using errcode = '23514', message = 'Personal workspaces must have exactly one active owner/member';
  end if;
end;
$$;

create or replace function public.check_workspace_membership_invariants_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'workspaces' then
    perform public.assert_workspace_membership_invariants(new.id);
  elsif tg_op = 'DELETE' then
    perform public.assert_workspace_membership_invariants(old.workspace_id);
  else
    perform public.assert_workspace_membership_invariants(new.workspace_id);
    if tg_op = 'UPDATE' and old.workspace_id is distinct from new.workspace_id then
      perform public.assert_workspace_membership_invariants(old.workspace_id);
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger trg_workspaces_membership_invariants
after insert or update of type on public.workspaces
deferrable initially deferred
for each row execute function public.check_workspace_membership_invariants_trigger();

create constraint trigger trg_membership_invariants
after insert or update or delete on public.workspace_members
deferrable initially deferred
for each row execute function public.check_workspace_membership_invariants_trigger();

-- Reject transaction writes against an ended/deleted tracker.
create or replace function public.guard_tracker_transaction_state()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tracker_status text;
  tracker_deleted_at timestamptz;
begin
  select t.status, t.deleted_at into tracker_status, tracker_deleted_at
    from public.trackers t
   where t.id = new.tracker_id and t.workspace_id = new.workspace_id
   for update;
  if not found then
    raise exception using errcode = '23503', message = 'Tracker not found in workspace';
  end if;
  if tracker_deleted_at is not null then
    raise exception using errcode = '23514', message = 'Cannot modify transactions in a deleted tracker';
  end if;
  if tracker_status = 'ended' then
    raise exception using errcode = '23514', message = 'Ended trackers are read-only until reopened';
  end if;
  return new;
end;
$$;

create trigger trg_tracker_transaction_state
before insert or update of workspace_id, tracker_id, type, amount, transaction_date, category_id, linked_expense_id, description, notes
on public.tracker_transactions
for each row execute function public.guard_tracker_transaction_state();

-- Ensure linked refunds refer to an expense, remain in the same workspace/tracker, and are capped.
-- Locking the original expense serializes concurrent refund writes against the same expense.
create or replace function public.guard_transaction_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original public.transactions%rowtype;
  already_refunded numeric(14,2);
begin
  if new.type = 'expense' then
    if new.linked_expense_id is not null then
      raise exception using errcode = '23514', message = 'Expenses cannot link to an original expense';
    end if;
    if tg_op = 'UPDATE' and new.amount is distinct from old.amount then
      select coalesce(sum(t.amount), 0) into already_refunded
        from public.transactions t
       where t.workspace_id = new.workspace_id
         and t.linked_expense_id = new.id
         and t.type = 'refund'
         and t.deleted_at is null;
      if already_refunded > new.amount then
        raise exception using errcode = '23514', message = 'Expense amount cannot be lower than its active linked refunds';
      end if;
    end if;
    return new;
  end if;

  if new.linked_expense_id is null then
    return new;
  end if;

  select * into original
    from public.transactions
   where id = new.linked_expense_id and workspace_id = new.workspace_id
   for update;
  if not found or original.type <> 'expense' or (original.deleted_at is not null and new.deleted_at is null) then
    raise exception using errcode = '23514', message = 'An active linked refund must reference an active expense in the same workspace';
  end if;

  select coalesce(sum(t.amount), 0) into already_refunded
    from public.transactions t
   where t.workspace_id = new.workspace_id
     and t.linked_expense_id = new.linked_expense_id
     and t.type = 'refund'
     and t.deleted_at is null
     and t.id is distinct from new.id;

  if already_refunded + new.amount > original.amount then
    raise exception using errcode = '23514', message = 'Linked refunds cannot exceed the original expense amount';
  end if;
  return new;
end;
$$;

create trigger trg_transactions_refund_guard
before insert or update of type, amount, linked_expense_id, deleted_at on public.transactions
for each row execute function public.guard_transaction_refund();

create or replace function public.guard_tracker_transaction_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original public.tracker_transactions%rowtype;
  already_refunded numeric(14,2);
begin
  if new.type = 'expense' then
    if new.linked_expense_id is not null then
      raise exception using errcode = '23514', message = 'Tracker expenses cannot link to an original expense';
    end if;
    if tg_op = 'UPDATE' and new.amount is distinct from old.amount then
      select coalesce(sum(t.amount), 0) into already_refunded
        from public.tracker_transactions t
       where t.workspace_id = new.workspace_id
         and t.tracker_id = new.tracker_id
         and t.linked_expense_id = new.id
         and t.type = 'refund'
         and t.deleted_at is null;
      if already_refunded > new.amount then
        raise exception using errcode = '23514', message = 'Tracker expense amount cannot be lower than its active linked refunds';
      end if;
    end if;
    return new;
  end if;

  if new.linked_expense_id is null then
    return new;
  end if;

  select * into original
    from public.tracker_transactions
   where id = new.linked_expense_id
     and workspace_id = new.workspace_id
     and tracker_id = new.tracker_id
   for update;
  if not found or original.type <> 'expense' or (original.deleted_at is not null and new.deleted_at is null) then
    raise exception using errcode = '23514', message = 'An active linked tracker refund must reference an active expense in the same tracker';
  end if;

  select coalesce(sum(t.amount), 0) into already_refunded
    from public.tracker_transactions t
   where t.workspace_id = new.workspace_id
     and t.tracker_id = new.tracker_id
     and t.linked_expense_id = new.linked_expense_id
     and t.type = 'refund'
     and t.deleted_at is null
     and t.id is distinct from new.id;

  if already_refunded + new.amount > original.amount then
    raise exception using errcode = '23514', message = 'Linked tracker refunds cannot exceed the original expense amount';
  end if;
  return new;
end;
$$;

create trigger trg_tracker_transactions_refund_guard
before insert or update of type, amount, linked_expense_id, deleted_at on public.tracker_transactions
for each row execute function public.guard_tracker_transaction_refund();

-- Every export/backup detail must match its queue job type.
create or replace function public.guard_export_job_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.background_jobs j
    where j.id = new.background_job_id
      and j.job_type in ('export', 'annual_export')
      and (j.workspace_id is null or j.workspace_id = new.workspace_id)
  ) then
    raise exception using errcode = '23514', message = 'Export detail must match an export background job and workspace';
  end if;
  return new;
end;
$$;

create trigger trg_export_job_type_guard
before insert or update of background_job_id, workspace_id on public.export_jobs
for each row execute function public.guard_export_job_type();

create or replace function public.guard_backup_run_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.background_jobs j
    where j.id = new.background_job_id
      and j.job_type in ('backup', 'annual_backup')
  ) then
    raise exception using errcode = '23514', message = 'Backup detail must match a backup background job';
  end if;
  return new;
end;
$$;

create trigger trg_backup_run_type_guard
before insert or update of background_job_id on public.backup_runs
for each row execute function public.guard_backup_run_type();

-- When a category is permanently deleted, surviving trashed rows can be restored
-- without that category and must be flagged for correction. Active references are blocked.
create or replace function public.handle_category_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.transactions t
     where t.category_id = old.id and t.deleted_at is null
  ) or exists (
    select 1 from public.tracker_transactions t
     where t.category_id = old.id and t.deleted_at is null
  ) then
    raise exception using errcode = '23503', message = 'Cannot permanently delete a category referenced by active transactions';
  end if;

  update public.transactions
     set category_id = null, needs_category_correction = true
   where category_id = old.id and deleted_at is not null;

  update public.tracker_transactions
     set category_id = null, needs_category_correction = true
   where category_id = old.id and deleted_at is not null;

  return old;
end;
$$;

create trigger trg_category_delete_guard
before delete on public.categories
for each row execute function public.handle_category_delete();

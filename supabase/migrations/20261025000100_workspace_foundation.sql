-- Reviewed subset of Stage 4. Financial and lifecycle tables are intentionally absent.
-- Migrations run as postgres in the local Supabase CLI.
begin;

alter default privileges for role postgres
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema public, private to authenticated;
revoke create on schema public from public, anon, authenticated, service_role;

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

create unique index workspace_members_one_active_owner_uq
  on public.workspace_members (workspace_id) where role = 'owner' and status = 'active';
create index workspace_members_active_user_idx
  on public.workspace_members (user_id, workspace_id) where status = 'active';

create table public.category_scopes (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null default 'user_group' check (scope_type = 'user_group'),
  created_at timestamptz not null default now()
);

-- The reconciled model is one scope per user, not a shared mutable category group.
create table public.category_scope_members (
  category_scope_id uuid primary key references public.category_scopes(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create table public.workspace_category_scopes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_scope_id uuid not null references public.category_scopes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workspace_id, category_scope_id)
);
create index workspace_category_scopes_scope_idx
  on public.workspace_category_scopes (category_scope_id, workspace_id);

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function private.touch_updated_at();
create trigger workspace_members_updated_at before update on public.workspace_members
  for each row execute function private.touch_updated_at();

-- Serialize membership changes on the parent, including moves between workspaces.
create function private.lock_membership_workspace()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.workspaces where id = new.workspace_id for update;
  elsif tg_op = 'DELETE' then
    perform 1 from public.workspaces where id = old.workspace_id for update;
  else
    perform 1 from public.workspaces
      where id in (old.workspace_id, new.workspace_id) order by id for update;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger workspace_members_lock before insert or update or delete on public.workspace_members
  for each row execute function private.lock_membership_workspace();

create function private.assert_workspace_integrity(p_workspace_id uuid)
returns void language plpgsql set search_path = '' as $$
declare
  workspace_type text;
  active_count integer;
  owner_count integer;
begin
  select type into workspace_type from public.workspaces where id = p_workspace_id for update;
  if not found then return; end if;
  select count(*), count(*) filter (where role = 'owner')
    into active_count, owner_count
    from public.workspace_members where workspace_id = p_workspace_id and status = 'active';
  if owner_count <> 1 or (workspace_type = 'personal' and active_count <> 1) then
    raise exception using errcode = '23514', message = 'Invalid workspace ownership or membership';
  end if;
  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.status = 'active'
      and not exists (
        select 1 from public.category_scope_members s
        join public.workspace_category_scopes w on w.category_scope_id = s.category_scope_id
        where s.user_id = m.user_id and w.workspace_id = p_workspace_id
      )
  ) or exists (
    select 1 from public.workspace_category_scopes w
    where w.workspace_id = p_workspace_id and not exists (
      select 1 from public.category_scope_members s
      join public.workspace_members m on m.user_id = s.user_id
      where s.category_scope_id = w.category_scope_id
        and m.workspace_id = p_workspace_id and m.status = 'active'
    )
  ) then
    raise exception using errcode = '23514', message = 'Workspace category scopes must match active membership';
  end if;
end;
$$;

create function private.check_workspace_integrity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'workspaces' then
    perform private.assert_workspace_integrity(new.id);
  else
    if tg_op <> 'INSERT' then perform private.assert_workspace_integrity(old.workspace_id); end if;
    if tg_op <> 'DELETE' then perform private.assert_workspace_integrity(new.workspace_id); end if;
  end if;
  return null;
end;
$$;
create constraint trigger workspaces_integrity after insert or update on public.workspaces
  deferrable initially deferred for each row execute function private.check_workspace_integrity();
create constraint trigger workspace_members_integrity after insert or update or delete on public.workspace_members
  deferrable initially deferred for each row execute function private.check_workspace_integrity();
create constraint trigger workspace_scopes_integrity after insert or update or delete on public.workspace_category_scopes
  deferrable initially deferred for each row execute function private.check_workspace_integrity();

create function private.check_scope_membership_integrity()
returns trigger language plpgsql set search_path = '' as $$
declare workspace_id uuid;
begin
  for workspace_id in
    select w.workspace_id from public.workspace_category_scopes w
      where w.category_scope_id in (old.category_scope_id, new.category_scope_id)
    union
    select m.workspace_id from public.workspace_members m
      where m.user_id in (old.user_id, new.user_id)
  loop
    perform private.assert_workspace_integrity(workspace_id);
  end loop;
  return null;
end;
$$;
create constraint trigger category_scope_members_integrity after update or delete on public.category_scope_members
  deferrable initially deferred for each row execute function private.check_scope_membership_integrity();

-- Provision scopes and maintain links inside the same trusted membership transaction.
create function private.create_profile_scope()
returns trigger language plpgsql set search_path = '' as $$
declare scope_id uuid;
begin
  insert into public.category_scopes default values returning id into scope_id;
  insert into public.category_scope_members (category_scope_id, user_id) values (scope_id, new.id);
  return new;
end;
$$;
create trigger profiles_scope after insert on public.profiles
  for each row execute function private.create_profile_scope();

create function private.sync_workspace_scopes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    delete from public.workspace_category_scopes w
    using public.category_scope_members s
    where w.workspace_id = old.workspace_id and w.category_scope_id = s.category_scope_id
      and s.user_id = old.user_id;
  end if;
  if tg_op <> 'DELETE' and new.status = 'active' then
    insert into public.workspace_category_scopes (workspace_id, category_scope_id)
      select new.workspace_id, s.category_scope_id from public.category_scope_members s
      where s.user_id = new.user_id on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger workspace_members_01_scopes after insert or update or delete on public.workspace_members
  for each row execute function private.sync_workspace_scopes();

create function private.is_active_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    join public.profiles p on p.id = m.user_id
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
      and m.status = 'active' and w.deleted_at is null and p.deleted_at is null
  );
$$;

create function private.can_read_category_scope(p_scope_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.category_scope_members s join public.profiles p on p.id = s.user_id
    where s.category_scope_id = p_scope_id and s.user_id = (select auth.uid()) and p.deleted_at is null
  ) or exists (
    select 1 from public.workspace_category_scopes w
    where w.category_scope_id = p_scope_id and private.is_active_workspace_member(w.workspace_id)
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.category_scopes enable row level security;
alter table public.category_scope_members enable row level security;
alter table public.workspace_category_scopes enable row level security;

revoke all on public.profiles, public.workspaces, public.workspace_members,
  public.category_scopes, public.category_scope_members, public.workspace_category_scopes
  from public, anon, authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated, service_role;
-- Grant helpers AFTER blanket revocation; these are not exposed as public RPCs.
grant execute on function private.is_active_workspace_member(uuid),
  private.can_read_category_scope(uuid) to authenticated;
grant select on public.profiles, public.workspaces, public.workspace_members,
  public.category_scopes, public.category_scope_members, public.workspace_category_scopes to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) and deleted_at is null);
create policy workspaces_read_member on public.workspaces for select to authenticated
  using (private.is_active_workspace_member(id));
create policy workspace_members_read_member on public.workspace_members for select to authenticated
  using (status = 'active' and private.is_active_workspace_member(workspace_id));
create policy category_scopes_read_member on public.category_scopes for select to authenticated
  using (private.can_read_category_scope(id));
create policy category_scope_members_read_member on public.category_scope_members for select to authenticated
  using (private.can_read_category_scope(category_scope_id));
create policy workspace_category_scopes_read_member on public.workspace_category_scopes for select to authenticated
  using (private.is_active_workspace_member(workspace_id));

commit;

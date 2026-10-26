begin;

-- Pin onboarding to one workspace without restricting ordinary multi-Household membership.
create table private.household_provisioning (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade
);
alter table private.household_provisioning enable row level security;
revoke all on private.household_provisioning from public, anon, authenticated, service_role;

create function public.ensure_household_workspace()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_workspace_id uuid;
begin
  -- Use the verified Auth row, not caller-supplied identity, email claims or metadata.
  select lower(u.email) into v_email from auth.users u
    where u.id = v_user_id and u.email_confirmed_at is not null for update;
  if not found then
    raise exception using errcode = '42501', message = 'Verified authentication required';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_user_id and p.deleted_at is not null) then
    raise exception using errcode = '42501', message = 'Account unavailable';
  end if;

  if v_email is distinct from 'priyavinod.t@gmail.com' then
    select w.id into v_workspace_id
      from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
      where m.user_id = v_user_id and m.status = 'active'
        and w.type = 'household' and w.deleted_at is null
      order by w.created_at, w.id limit 1;
    if v_workspace_id is null then
      raise exception using errcode = '42501', message = 'Active Household membership required';
    end if;
    perform public.ensure_personal_workspace();
    return v_workspace_id;
  end if;

  perform public.ensure_personal_workspace();
  select p.workspace_id into v_workspace_id from private.household_provisioning p
    where p.user_id = v_user_id;
  if v_workspace_id is null then
    -- Adopt an existing owned Household; never replace a deleted/removed legacy Household.
    select w.id into v_workspace_id from public.workspaces w
      where w.created_by = v_user_id and w.type = 'household'
      order by w.created_at, w.id limit 1;
  end if;
  if v_workspace_id is null then
    insert into public.workspaces (name, type, created_by)
      values ('Household', 'household', v_user_id) returning id into v_workspace_id;
    insert into public.workspace_members (workspace_id, user_id, role, status)
      values (v_workspace_id, v_user_id, 'owner', 'active');
  end if;
  if not exists (
    select 1 from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
      where w.id = v_workspace_id and w.type = 'household' and w.deleted_at is null
        and m.user_id = v_user_id and m.role = 'owner' and m.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Active Household ownership required';
  end if;
  insert into private.household_provisioning (user_id, workspace_id)
    values (v_user_id, v_workspace_id) on conflict (user_id) do nothing;
  return v_workspace_id;
end;
$$;
revoke all on function public.ensure_household_workspace() from public, anon, authenticated, service_role;
grant execute on function public.ensure_household_workspace() to authenticated;

commit;

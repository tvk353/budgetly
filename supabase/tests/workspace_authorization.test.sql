begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to anon, authenticated;
grant execute on all functions in schema extensions to anon, authenticated;
set local search_path = public, extensions;
select plan(39);

-- Disposable DB fixtures only; never used as application signup/provisioning logic.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@budgetly.test'),
  ('10000000-0000-4000-8000-000000000002', 'member@budgetly.test'),
  ('10000000-0000-4000-8000-000000000003', 'third@budgetly.test'),
  ('10000000-0000-4000-8000-000000000004', 'outsider@budgetly.test');
insert into public.profiles (id) select id from auth.users
  where id in (
    '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'
  );
insert into public.workspaces (id, name, type) values
  ('20000000-0000-4000-8000-000000000001', 'Owner personal', 'personal'),
  ('20000000-0000-4000-8000-000000000002', 'Shared household', 'household'),
  ('20000000-0000-4000-8000-000000000003', 'Outsider personal', 'personal'),
  ('20000000-0000-4000-8000-000000000004', 'Deleted household', 'household');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'member'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'member'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'owner'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'owner');
update public.workspaces set deleted_at = now(), purge_after = now() + interval '30 days'
  where id = '20000000-0000-4000-8000-000000000004';
set constraints all immediate;
set constraints all deferred;

select is((select count(*)::integer from public.workspace_members
  where workspace_id = '20000000-0000-4000-8000-000000000002'), 3, 'household supports more than two members');
select is((select count(*)::integer from public.workspace_category_scopes
  where workspace_id = '20000000-0000-4000-8000-000000000002'), 3, 'all member scopes linked atomically');
select ok(not has_table_privilege('anon', 'public.workspaces', 'SELECT'), 'anon has no workspace grants');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT'), 'clients cannot insert memberships');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE'), 'clients cannot change roles');
select ok(not has_table_privilege('authenticated', 'public.workspaces', 'DELETE'), 'clients cannot hard delete workspaces');
select ok(not has_function_privilege('anon', 'private.is_active_workspace_member(uuid)', 'EXECUTE'), 'anon cannot execute membership helper');
select ok(has_function_privilege('authenticated', 'private.is_active_workspace_member(uuid)', 'EXECUTE'), 'helper grant survives revocation');
select ok(not has_function_privilege('authenticated', 'private.assert_workspace_integrity(uuid)', 'EXECUTE'), 'internal integrity function not callable');
select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'every public application table has RLS');

set local role anon;
select throws_ok($$select * from public.workspaces$$, '42501', null, 'anonymous reads denied by grants');
reset role;
set local role authenticated;
set local request.jwt.claims = '{}';
select is((select count(*)::integer from public.workspaces), 0, 'authenticated role without identity has no rows');
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces), 2, 'owner sees own personal and household workspaces');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces), 1, 'member sees shared household only');
select is((select count(*)::integer from public.workspace_members), 3, 'member sees active shared roster');
select is((select count(*)::integer from public.profiles), 1, 'profiles are self-only');
select is((select count(*)::integer from public.category_scopes), 3, 'shared member sees linked user scopes');
select is((select count(*)::integer from public.workspace_category_scopes), 3, 'links do not reveal private workspaces');
select throws_ok(
  $$update public.workspace_members set role = 'owner' where user_id = '10000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'member cannot promote self'
);
select throws_ok($$delete from public.workspaces$$, '42501', null, 'direct hard deletion denied');
select throws_ok($$insert into public.workspaces (name, type) values ('Untrusted', 'household')$$,
  '42501', null, 'direct workspace creation denied');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces), 1, 'outsider sees only own active personal workspace');
select is((select count(*)::integer from public.category_scopes), 1, 'outsider cannot see household scopes');
select is((select count(*)::integer from public.workspace_members
  where workspace_id = '20000000-0000-4000-8000-000000000004'), 0, 'deleted workspace hides roster');

reset role;
update public.workspace_members set status = 'removed', removed_at = now()
  where workspace_id = '20000000-0000-4000-8000-000000000002'
    and user_id = '10000000-0000-4000-8000-000000000002';
set constraints all immediate;
set constraints all deferred;
select is((select count(*)::integer from public.workspace_category_scopes
  where workspace_id = '20000000-0000-4000-8000-000000000002'), 2, 'removal unlinks user scope');
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces), 0, 'old session loses removed workspace immediately');
select is((select count(*)::integer from public.workspace_members), 0, 'removed session loses roster');
select is((select count(*)::integer from public.category_scopes), 1, 'removed user retains only own scope');

reset role;
update public.profiles set deleted_at = now() where id = '10000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces), 0, 'deleted profile cannot access workspace');
select is((select count(*)::integer from public.category_scopes), 0, 'deleted profile cannot access category scopes');

reset role;
select throws_ok($$
  do $test$ begin
    insert into public.workspaces (name, type) values ('Missing owner', 'household');
    set constraints all immediate;
  end $test$;
$$, '23514', null, 'ownerless workspace rejected at constraint flush');
select throws_ok($$
  do $test$ begin
    insert into public.workspace_members (workspace_id, user_id, role)
      values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'member');
    set constraints all immediate;
  end $test$;
$$, '23514', null, 'personal workspace rejects additional member');
select throws_ok($$
  insert into public.workspace_members (workspace_id, user_id, role)
    values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'owner')
$$, '23505', null, 'second active owner rejected');
select throws_ok($$
  do $test$ begin
    delete from public.workspace_category_scopes
      where workspace_id = '20000000-0000-4000-8000-000000000002';
    set constraints all immediate;
  end $test$;
$$, '23514', null, 'scope links cannot diverge from active membership');
select throws_ok($$
  do $test$ begin
    delete from public.category_scope_members where user_id = '10000000-0000-4000-8000-000000000001';
    set constraints all immediate;
  end $test$;
$$, '23514', null, 'scope membership mutation cannot orphan workspace links');

create table public.future_acl_probe (id integer);
create function public.future_function_probe() returns boolean language sql as $$select true$$;
select ok(not has_table_privilege('authenticated', 'public.future_acl_probe', 'SELECT'), 'future table default denies reads');
select ok(not has_function_privilege('authenticated', 'public.future_function_probe()', 'EXECUTE'), 'future function default denies execution');
select ok(not has_table_privilege('anon', 'public.future_acl_probe', 'SELECT'), 'future table denies anonymous reads');
select ok(not has_function_privilege('service_role', 'public.future_function_probe()', 'EXECUTE'), 'future function denies service-role execution');

select * from finish();
rollback;

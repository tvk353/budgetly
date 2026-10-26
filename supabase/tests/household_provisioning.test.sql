begin;
set local search_path = public, extensions;
select plan(32);

select ok(not has_function_privilege('anon', 'public.ensure_household_workspace()', 'EXECUTE'), 'anonymous provisioning denied');
select ok(not has_function_privilege('service_role', 'public.ensure_household_workspace()', 'EXECUTE'), 'service role cannot provision Households');
select ok(not has_table_privilege('authenticated', 'private.household_provisioning', 'SELECT,INSERT,UPDATE,DELETE'), 'onboarding mapping is private');

-- A DB-only SSO fixture does not collide with an existing email-provider account.
insert into auth.users (id, email, email_confirmed_at, is_sso_user) values
  ('50000000-0000-4000-8000-000000000001', 'priyavinod.t@gmail.com', now(), true),
  ('50000000-0000-4000-8000-000000000002', 'household-outsider@budgetly.test', now(), false),
  ('50000000-0000-4000-8000-000000000003', 'household-unverified@budgetly.test', null, false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.ensure_personal_workspace();
reset role;
create temporary table preserved_personal as
  select w.* from public.workspaces w where w.created_by = '50000000-0000-4000-8000-000000000001';
create temporary table preserved_members as select * from public.workspace_members where user_id = '50000000-0000-4000-8000-000000000001';
create temporary table preserved_scopes as select * from public.workspace_category_scopes where workspace_id in (select id from preserved_personal);
set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.ensure_household_workspace()$$, 'shared verified account creates Household');
select lives_ok($$select public.ensure_household_workspace()$$, 'repeat login retrieves Household');
select lives_ok($$set constraints all immediate$$, 'owner and category-scope integrity holds under authenticated role');
select is((select count(*)::integer from public.workspaces where type = 'household'), 1, 'one Household after retries');
select is((select created_by from public.workspaces where type = 'household'), auth.uid(), 'authenticated shared account is creator');
select is((select count(*)::integer from public.workspace_members m join public.workspaces w on w.id = m.workspace_id where w.type = 'household' and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active'), 1, 'exactly one active owner membership');
select is(public.ensure_household_workspace(), (select id from public.workspaces where type = 'household'), 'stable returned workspace ID');
select throws_ok($$insert into public.workspaces(name,type,created_by) values ('Forged','household',auth.uid())$$, '42501', null, 'client cannot create arbitrary workspace');
select throws_ok($$update public.workspace_members set role = 'owner'$$, '42501', null, 'client cannot assign ownership');
reset role;
set constraints all deferred;
select is((select count(*)::integer from (select * from preserved_personal except select * from public.workspaces) d), 0, 'Personal row and all fields unchanged');
select is((select count(*)::integer from (select * from preserved_members except select * from public.workspace_members) d), 0, 'Personal membership unchanged');
select is((select count(*)::integer from (select * from preserved_scopes except select * from public.workspace_category_scopes) d), 0, 'Personal scope links unchanged');
select is((select count(*)::integer from private.household_provisioning where user_id = '50000000-0000-4000-8000-000000000001'), 1, 'one database-constrained onboarding mapping');
select throws_ok($$insert into private.household_provisioning select * from private.household_provisioning$$, '23505', null, 'duplicate provisioning mapping prohibited');

set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated","email":"priyavinod.t@gmail.com"}';
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'outsider with forged email claim cannot provision');
select is((select count(*)::integer from public.workspaces), 0, 'outsider cannot read shared Household or Personal');
reset role;
insert into public.profiles(id) values ('50000000-0000-4000-8000-000000000002');
insert into public.workspace_members(workspace_id,user_id,role)
  select workspace_id, '50000000-0000-4000-8000-000000000002', 'member' from private.household_provisioning where user_id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.ensure_household_workspace(), (select id from public.workspaces where type = 'household'), 'existing active non-owner member can log in');
select is((select role from public.workspace_members m join public.workspaces w on w.id = m.workspace_id where w.type = 'household' and m.user_id = auth.uid()), 'member', 'login does not promote existing member');
reset role;
update public.workspace_members set status = 'removed', removed_at = now() where user_id = '50000000-0000-4000-8000-000000000002' and role = 'member';
set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'removed member cannot log in or restore membership');
select is((select count(*)::integer from public.workspaces where type = 'household'), 0, 'removed member cannot read Household');
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'unverified identity denied');
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'missing authenticated identity denied');
reset role;

update public.workspaces set deleted_at = now(), purge_after = now() + interval '30 days'
  where type = 'household' and created_by = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'deleted Household is not replaced or restored');
reset role;
update public.workspaces set deleted_at = null, purge_after = null
  where type = 'household' and created_by = '50000000-0000-4000-8000-000000000001';
delete from private.household_provisioning where user_id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.ensure_household_workspace(), (select id from public.workspaces where type = 'household'), 'legacy owned Household adopted without duplication');
reset role;
-- Ownership transfer/removal is a trusted transaction, never part of login.
set constraints all deferred;
update public.workspace_members set role = 'member' where user_id = '50000000-0000-4000-8000-000000000001' and workspace_id in (select workspace_id from private.household_provisioning);
update public.workspace_members set role = 'owner', status = 'active', removed_at = null where user_id = '50000000-0000-4000-8000-000000000002' and workspace_id in (select workspace_id from private.household_provisioning);
update public.workspace_members set status = 'removed', removed_at = now() where user_id = '50000000-0000-4000-8000-000000000001' and workspace_id in (select workspace_id from private.household_provisioning);
set constraints all immediate;
set local role authenticated;
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'shared account cannot regain transferred ownership');
reset role;
select is((select count(*)::integer from public.workspaces where type = 'household' and created_by = '50000000-0000-4000-8000-000000000001'), 1, 'denied retries do not create replacement Households');
select is((select status from public.workspace_members where user_id = '50000000-0000-4000-8000-000000000001' and workspace_id in (select workspace_id from private.household_provisioning)), 'removed', 'removed shared membership unchanged');
update public.profiles set deleted_at = now() where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select public.ensure_household_workspace()$$, '42501', null, 'deleted profile denied');
reset role;
select ok((select relrowsecurity from pg_class where oid = 'private.household_provisioning'::regclass), 'onboarding mapping has RLS enabled');
select * from finish();
rollback;

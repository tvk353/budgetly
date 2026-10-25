begin;
set local search_path = public, extensions;
select plan(14);
insert into auth.users(id,email,email_confirmed_at) values
  ('50000000-0000-4000-8000-000000000001','onboarding@budgetly.test',now()),
  ('50000000-0000-4000-8000-000000000002','onboarding-owner@budgetly.test',now());
set local role authenticated;
set local request.jwt.claims='{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.ensure_personal_workspace()$$,'first login provisions Personal');
select lives_ok($$select public.ensure_personal_workspace()$$,'repeat login is idempotent');
select is((select count(*)::integer from public.profiles),1,'one own profile after repeat login');
select is((select count(*)::integer from public.category_scope_members),1,'one own category scope after repeat login');
select is((select count(*)::integer from public.workspaces where type='personal'),1,'one Personal workspace after repeat login');
select is((select count(*)::integer from public.workspaces where type='household'),0,'no automatic Household provisioning');
reset role;
insert into public.profiles(id) values('50000000-0000-4000-8000-000000000002');
update public.workspaces set name='My Personal' where created_by='50000000-0000-4000-8000-000000000001';
insert into public.workspaces(id,name,type,created_by) values
  ('60000000-0000-4000-8000-000000000001','Family home','household','50000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000000002','Weekend home','household','50000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000000003','Deleted home','household','50000000-0000-4000-8000-000000000002');
insert into public.workspace_members(workspace_id,user_id,role)
  select id,'50000000-0000-4000-8000-000000000002','owner' from public.workspaces
  where created_by='50000000-0000-4000-8000-000000000002';
insert into public.workspace_members(workspace_id,user_id,role)
  select id,'50000000-0000-4000-8000-000000000001','member' from public.workspaces
  where created_by='50000000-0000-4000-8000-000000000002';
update public.workspaces set deleted_at=now(),purge_after=now()+interval '30 days'
  where id='60000000-0000-4000-8000-000000000003';
set constraints all immediate;
set constraints all deferred;
set local role authenticated;
set local request.jwt.claims='{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::integer from public.workspaces),3,'all distinct active Household and Personal memberships load');
select is((select array_agg(name order by name) from public.workspaces),array['Family home','My Personal','Weekend home'],'RLS exposes real names without collapsing types');
select is((select count(*)::integer from public.workspaces where id='60000000-0000-4000-8000-000000000003'),0,'deleted Household is not selectable');
reset role;
update public.workspace_members set status='removed',removed_at=now()
  where workspace_id='60000000-0000-4000-8000-000000000001' and user_id='50000000-0000-4000-8000-000000000001';
set constraints all immediate;
set constraints all deferred;
set local role authenticated;
select lives_ok($$select public.ensure_personal_workspace()$$,'login after removal still succeeds for Personal');
select is((select count(*)::integer from public.workspaces),2,'relogin never restores removed Household access');
select is((select name from public.workspaces where type='personal'),'My Personal','relogin preserves the existing Personal identity and name');
reset role;
select is((select status from public.workspace_members where workspace_id='60000000-0000-4000-8000-000000000001' and user_id='50000000-0000-4000-8000-000000000001'),'removed','provisioning never reactivates removed membership');
select is((select count(*)::integer from public.workspace_category_scopes wcs join public.category_scope_members csm on csm.category_scope_id=wcs.category_scope_id where wcs.workspace_id='60000000-0000-4000-8000-000000000001' and csm.user_id='50000000-0000-4000-8000-000000000001'),0,'provisioning never restores a removed shared category link');
select * from finish();
rollback;

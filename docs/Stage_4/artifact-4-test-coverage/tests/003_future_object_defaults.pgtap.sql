-- Budgetly Artifact 4: future-object privilege and RLS probe
-- DRAFT ONLY. Run only in the explicitly approved disposable local database.
-- Run as the same database role that owns/creates migrations.
-- This probe creates and rolls back temporary public objects; it does not apply migrations.

begin;
select no_plan();

DO $fixture_guard$
BEGIN
  IF current_setting('budgetly.disposable_test', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Refusing future-object probe without disposable-test marker';
  END IF;
END;
$fixture_guard$;

create table public.budgetly_future_object_probe (id integer primary key);
create function public.budgetly_future_function_probe()
returns integer
language sql
as $$ select 1 $$;

select ok(
  not has_table_privilege('anon', 'public.budgetly_future_object_probe', 'SELECT')
  and not has_table_privilege('authenticated', 'public.budgetly_future_object_probe', 'SELECT'),
  'future public tables do not receive client SELECT by default'
);

select ok(
  not has_function_privilege('anon', 'public.budgetly_future_function_probe()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.budgetly_future_function_probe()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.budgetly_future_function_probe()', 'EXECUTE'),
  'future public functions do not receive PUBLIC, client, or service_role EXECUTE by default'
);

select ok(
  not (select c.relrowsecurity
         from pg_catalog.pg_class c
         join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'budgetly_future_object_probe'),
  'PostgreSQL does not automatically enable RLS on a newly created table; each migration must do so'
);

alter table public.budgetly_future_object_probe enable row level security;
revoke all on public.budgetly_future_object_probe from anon, authenticated;
grant select on public.budgetly_future_object_probe to anon, authenticated;
create policy budgetly_future_object_probe_deny on public.budgetly_future_object_probe
  for select to anon, authenticated using (false);

select ok(
  (select c.relrowsecurity
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'budgetly_future_object_probe'),
  'future-object migration step explicitly enables RLS'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role anon;
select is((select count(*)::integer from public.budgetly_future_object_probe), 0,
          'RLS default-deny policy hides the probe from anon');
reset role;
set local role authenticated;
select is((select count(*)::integer from public.budgetly_future_object_probe), 0,
          'RLS default-deny policy hides the probe from authenticated');
reset role;

select * from finish();
rollback;

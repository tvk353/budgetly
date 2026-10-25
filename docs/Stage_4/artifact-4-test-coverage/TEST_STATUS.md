# Test Design Status and Execution Record

- Stage 4 test strategy authored: yes.
- Coverage matrix authored: yes.
- Authorization pgTAP draft authored: yes; fixed-ID public fixture setup/cleanup and a loopback-guarded runner are drafted. Five synthetic `auth.users` must first be provisioned by a version-pinned local helper.
- Business-logic pgTAP draft authored: yes; immediate constraints, linked-refund boundaries, refund Trash/restore capacity, and child mismatch cases are drafted.
- Deferred job-parent COMMIT probes authored: yes; expected SQLSTATE `23514` cases are scripted but unrun.
- Two-session refund, expense-edit, Trash, and restore session pairs authored; they require two live local database sessions and lock-wait coordination. Purge concurrency remains blocked on the missing trusted purge contract.
- Future-object default ACL/RLS probe authored; run as each approved object-creating role. PostgreSQL does not auto-enable RLS on future tables.
- API/worker integration scenarios authored: yes.
- Tests executed: **no** (per user instruction).
- Runner syntax: PowerShell parser passed.
- Local database clients: `psql`, `pg_prove`, and `pgbench` are unavailable; no database test can be executed in this environment.
- Database connected or changed: **no**.
- Migrations applied: **no**.
- Stage 4 design status: complete.
- Implementation/release approval: **not granted**.

Before implementation readiness, bind tests to the final schema/functions, remove placeholders, and review the test matrix. Any test execution must be separately authorized and must use a disposable local Supabase/PostgreSQL environment with synthetic fixtures only.

Record future runs only after explicit approval:

- Date/time:
- Git commit / schema version:
- Supabase/PostgreSQL version:
- Command:
- Result:
- Failing case IDs:
- Reviewer:

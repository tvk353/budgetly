# Stage 4 concurrency test procedures

These scripts are draft tests for a separately approved disposable local PostgreSQL/Supabase database. Provision the five synthetic Auth users with the version-pinned local helper, set the loopback connection variables/explicit disposable acknowledgement required by `run_disposable_pgtap.ps1`, and set `PGOPTIONS=-c budgetly.disposable_test=on`. For manual races, run `fixture_setup.sql` with psql before starting the sessions; do not point them at staging or production. Each test uses two independent interactive `psql` sessions. Start Session A, wait for its prompt, start Session B in a second terminal, and confirm B is waiting in `pg_stat_activity` with `wait_event_type = 'Lock'` before pressing Enter in A. The expected SQLSTATE is `23514` in B. After each case, run `fixture_cleanup.sql` and `fixture_setup.sql` again to restore the baseline. The guarded runner runs the serial pgTAP/commit probes and cleans up automatically.

## Linked refund concurrency

Run `ordinary_refund_session_a.psql` and `ordinary_refund_session_b.psql`. A inserts INR 600.00 against a INR 1,000.00 expense and holds the parent-row lock uncommitted; B attempts INR 500.00. After A commits, B must fail and the committed active linked-refund total must remain at or below INR 1,000.00.

Run `tracker_refund_session_a.psql` and `tracker_refund_session_b.psql` for the same invariant within one tracker. Query each parent after both sessions finish and verify the active refund sum and tracker/workspace relationship.

## Expense edit race

Run `expense_edit_session_a.psql` and `expense_edit_session_b.psql`. A lowers the INR 500.00 expense to INR 700.00 while its existing linked refunds total INR 200.00. B attempts INR 600.00. After A commits, B must fail because the resulting total would exceed the new expense amount.

For the refund-first order on a clean fixture reset, run `refund_before_expense_edit_session_a.psql` and `refund_before_expense_edit_session_b.psql`. A commits an INR 600.00 refund first; B's reduction of that INR 1,000.00 expense to INR 500.00 must fail.

## Trash and restore races

Run `trash_session_a.psql` with `trash_session_b.psql`, then `restore_session_a.psql` with `restore_session_b.psql`. Session A uses the disposable database owner to emulate the currently missing trusted multi-row lifecycle operation; Session B uses `authenticated`. Verify no active refund can be committed against a trashed expense and that the restored linked refund is included in the remaining-cap calculation.

These owner-issued statements test trigger/locking behavior only. They do not verify an application/RPC lifecycle operation, authorization to invoke it, atomic audit writes, or its rollback behavior because the draft package has not specified or implemented that operation.

## Purge race: blocked

There is no approved purge function/route contract to invoke, and the draft FK uses `ON DELETE SET NULL` for linked refunds. Do not simulate a purge by deleting the parent directly: that can turn retained refunds into unlinked refunds. Before adding an executable two-session purge test, define the trusted operation and require it to atomically purge the expense and linked refunds, remove associated audit records as approved, update tombstones idempotently, and serialize against concurrent refund creation. The test must then race refund creation against purge, repeat purge, and assert no orphan/unlinked refund, partial deletion, or backup resurrection.

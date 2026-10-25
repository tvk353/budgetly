# Test strategy

## 1. Objectives

Demonstrate that Budgetly enforces authorization and business rules at the database and service boundaries, not only in the UI.

Primary risk areas:

- Cross-workspace reads and writes, including a removed household member.
- Linked and unlinked refunds, including concurrent partial refunds.
- Monthly budget calculations and calendar-month uniqueness.
- Soft-delete, restore, retention, permanent purge, and tombstone reconciliation.
- Export creation, status transitions, retry, and access-controlled downloads.
- Hidden/ended trackers and savings behavior.
- Background job and audit-log confidentiality.

## 2. Test layers

| Layer                            | Purpose                                                         | Suitable cases                                                                                               |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| PostgreSQL constraints           | Reject invalid persisted states                                 | Amount precision/range, required fields, unique month budget, composite tracker FK, category correction flag |
| pgTAP + RLS                      | Validate row visibility and permitted writes as `authenticated` | Workspace isolation, member parity, removed-member denial, direct client privilege denial                    |
| Transactional database/RPC tests | Verify multi-row atomicity and invariants                       | Refund caps, owner transfer, cascade soft-delete/restore, purge idempotency                                  |
| API integration                  | Verify identity, validation, status codes, response filtering   | Export creation, invite/recovery flows, pagination, auth failure                                             |
| Multi-session concurrency        | Verify race conditions                                          | Simultaneous linked refunds, two budget creates, concurrent owner transfer and removal                       |
| Worker integration               | Verify asynchronous workflows                                   | Export retries, failed jobs, backup reconciliation, cleanup retries                                          |
| UI tests (later)                 | Confirm useful interaction and error handling                   | Correction prompts, budget display, restore flows                                                            |

## 3. Priority definitions

- **P0 — release blocker:** unauthorized access, data corruption, over-refund, resurrection of purged data, or cross-workspace export leakage.
- **P1 — required before private beta:** incorrect budget/refund totals, failed recovery paths, non-idempotent worker operations, missing retention enforcement.
- **P2 — important:** edge cases, accessibility of error handling, operational observability, rare malformed inputs.

## 4. Shared synthetic fixture model

Use synthetic users:

- `user_a`: owner of `personal_a`, active household member and owner of `household_ab`.
- `user_b`: active member of `household_ab`, owner of `personal_b`.
- `user_c`: unrelated user and owner of `household_c`.
- `user_d`: a member removed from a workspace before the authorization test.

Use separate workspaces and distinct rows for each user/workspace. Test as real `authenticated` role with `request.jwt.claim.sub` / supported Supabase JWT claim simulation. Do not test only as database owner or `service_role`, because those roles may bypass RLS.

All fixture IDs and amounts must be deterministic and generated in a disposable database.

### Deterministic fixture contract

- Resolve every fixture variable in the pgTAP drafts to fixed UUID constants. Use the following reserved test ranges; the harness seeds these IDs and never depends on `gen_random_uuid()` output in assertions:
  - Users `user_a` through `user_e`: `10000000-0000-4000-8000-000000000001` through `10000000-0000-4000-8000-000000000005`.
  - Workspaces `household_abc`, `personal_a`, `personal_b`, `personal_c`, `household_e`: `20000000-0000-4000-8000-000000000001` through `20000000-0000-4000-8000-000000000005`.
  - Category scopes `scope_a`, `scope_b`, `scope_c`, `scope_e`, `scope_unlinked`: `30000000-0000-4000-8000-000000000001` through `30000000-0000-4000-8000-000000000005`.
- Map category IDs: `builtin_category` = `40000000-0000-4000-8000-000000000001`; `category_a` = `40000000-0000-4000-8000-000000000002`; `category_unlinked` = `40000000-0000-4000-8000-000000000003`; `ordinary_category` = `40000000-0000-4000-8000-000000000004`; `tracker_category` = `40000000-0000-4000-8000-000000000005`.
- `builtin_tracker_category` = `40000000-0000-4000-8000-000000000006`; use this global built-in fixture for the unrelated household's tracker transaction.
- The unrelated workspace's tracker fixture uses built-in tracker category `40000000-0000-4000-8000-000000000006` so category type compatibility is satisfied without linking a custom scope.
- Map `label_a` to `50000000-0000-4000-8000-000000000001`. Ordinary transactions: `expense_a` = `60000000-0000-4000-8000-000000000001`; `expense_refund_case` = `60000000-0000-4000-8000-000000000002`; `expense_update_case` = `60000000-0000-4000-8000-000000000003`; `refund_update_case` = `60000000-0000-4000-8000-000000000004`; its other refund = `60000000-0000-4000-8000-000000000005`; `expense_reduce_case` = `60000000-0000-4000-8000-000000000006`; its refunds = `60000000-0000-4000-8000-000000000007` and `60000000-0000-4000-8000-000000000008`; `trash_transaction_case` = `60000000-0000-4000-8000-000000000009`.
- Map `expense_trash_case` = `60000000-0000-4000-8000-000000000013` with active linked child `...0014`; map `expense_restore_case` = `...0011` and child `...0012`, both trashed with fixed 30-day metadata; map `expense_purge_case` = `...0015` and trashed child `...0016`. Include those IDs explicitly in setup and cleanup.
- The cleanup fixture deletes only reserved fixture IDs plus concurrency rows in the `80000000`, `82000000`, and `83000000` ranges; it never deletes `auth.users`.
- Concurrency-created ordinary refund IDs are `80000000-0000-4000-8000-000000000001` through `...0004`; tracker race refund IDs are `82000000-0000-4000-8000-000000000001` and `...0002`; Trash/restore race refund IDs are `83000000-0000-4000-8000-000000000001` and `...0002`; restore-cap pgTAP refund ID is `84000000-0000-4000-8000-000000000001`. Cleanup deletes only these reserved IDs.
- Map `savings_transaction_a` to `61000000-0000-4000-8000-000000000001`. Tracker transactions: `tracker_transaction_a` = `62000000-0000-4000-8000-000000000001`; `tracker_expense_refund_case` = `62000000-0000-4000-8000-000000000002`; `tracker_refund_update_case` = `62000000-0000-4000-8000-000000000003`; its other refund = `62000000-0000-4000-8000-000000000004`; `tracker_concurrent_refund_case` = `62000000-0000-4000-8000-000000000006`.
- Map `tracker_a` to `63000000-0000-4000-8000-000000000001`, `fund_a` to `64000000-0000-4000-8000-000000000001`, `invitation_a` to `65000000-0000-4000-8000-000000000001`, and `budget_a` to `66000000-0000-4000-8000-000000000001`.
- Map `backup_job_id`, `export_job_id`, and `empty_job_id` to `70000000-0000-4000-8000-000000000001`, `70000000-0000-4000-8000-000000000002`, and `70000000-0000-4000-8000-000000000003`, respectively. Map their detail rows with the corresponding `71000000` export and `72000000` backup prefixes.
- `user_a` owns `household_abc`; `user_b` and `user_c` are additional active members. This three-member fixture proves the approved no-two-member-cap model and exactly-one-owner invariant. Each has a Personal workspace and category scope.
- `user_d` was formerly an active member and is removed before revocation tests; `user_e` is unrelated and owns a separate workspace.
- Seed `workspace_category_scopes` for each Personal workspace and for all active household-member scopes. Include same-named categories in distinct scopes, built-in categories of both types, archived categories, and one category scope not linked to the tested workspace.
- Seed one household label and one label in another workspace; transactions should include an expense, an unlinked refund, partial linked refunds, a tracker expense/refund pair, and soft-deleted rows. Include savings, budget, invitation, audit, idempotency, job/detail, deletion-request, and tombstone rows only where each test needs them.
- Seed these fixed financial cases: `expense_refund_case` = INR 1,000.00 with no refunds; `expense_update_case` = INR 500.00 with two linked refunds of INR 100.00 each, one named `refund_update_case`; `expense_reduce_case` = INR 1,000.00 with active refunds totaling INR 600.00; `tracker_expense_refund_case` = INR 1,000.00 with another refund of INR 600.00 and `tracker_refund_update_case` = INR 400.00; `trash_transaction_case` has no linked children. Record a matching workspace, category, and tracker for each.
- Seed `backup_job_id` with exactly one `backup_runs` row, `export_job_id` with exactly one `export_jobs` row, and `empty_job_id` as a cleanup job with no detail row. These allow positive and deferred-integrity cases.
- `fixture_setup.sql` requires the exact final schema and pgTAP, verifies the five fixed synthetic Auth IDs already exist, and inserts only public fixtures. Provision `auth.users` through a version-pinned local helper; this script deliberately does not write the managed Auth schema.
- `run_disposable_pgtap.ps1` requires an explicit disposable acknowledgement and a loopback host, sets the fixture marker, runs setup/tests/cleanup, and checks TAP failures. It does not apply migrations or create Auth users.
- Run `003_future_object_defaults.pgtap.sql` as each object-creating role. It checks future table/function default ACLs and confirms RLS remains opt-in, so every future table migration must explicitly enable RLS and add reviewed policies.
- Start each authorization case with an explicit role and identity claim. Exercise both `anon` and `authenticated`; do not let a prior user's claim or role leak between cases. Run ordinary policies as `authenticated`, never as `service_role` or the table owner.
- Use fixed timestamps around IST month/day boundaries. Roll each independent case back or use deterministic teardown in FK order; explicitly test deferred constraints at transaction commit.
- Run concurrency cases with two independent database connections and a synchronization barrier. A single pgTAP transaction cannot establish the required race behavior.

## 5. Business rules to assert

### Refunds

- Expense and refund amounts are positive exact decimals with two-decimal precision.
- Linked refund and expense belong to the same workspace.
- Linked refunds are associated with an expense; an expense cannot itself be a refund target.
- Sum of active linked refunds cannot exceed the original expense amount.
- Multiple partial refunds are allowed up to the remaining refundable amount.
- Concurrent refund requests cannot collectively exceed the expense amount.
- Refunds reduce net eligible expenses and restore available budget.
- Deleting a linked refund restores refundable capacity; deleting an expense moves it and its linked refunds to Trash together.
- Restored transactions with a permanently deleted category have `category_id IS NULL` and `needs_category_correction = true`.

### Budgets

- At most one budget per workspace and calendar month.
- A new budget can be created only for the current `Asia/Kolkata` calendar month; past budgets may be edited; future budget creation is rejected.
- Base budget and rollover cannot be negative.
- Available budget can be negative.
- `applicable = base_budget + rollover`.
- `net eligible expenses = eligible expenses - eligible refunds`.
- `available = applicable - net eligible expenses`.
- Budget updates recalculate dependent totals immediately.
- Hidden trackers and savings transactions do not affect the monthly budget.

### Deletion and recovery

- Soft-deleted rows disappear from normal lists/reports and appear in Trash.
- `purge_after` is 30 days after `deleted_at`, with consistent nullability.
- Restore is allowed only before the recovery deadline and by a currently authorized actor.
- Restoring a parent with dependent rows follows the approved cascade rules.
- Permanent purge is idempotent and removes required dependent data and associated audit records.
- Workspace/account tombstones prevent data resurrection during backup reconciliation.
- Deleted invitations are revoked immediately and never reactivated on restoration.
- After membership removal, a user loses access immediately, including to previously known IDs.

### Exports

- Only active records are exported; hidden trackers are excluded from normal reports/exports as specified.
- One workspace per user-initiated export.
- Export request captures requester, workspace, date range, requested data types, and job status.
- A requester must be authorized at request time and again at download time.
- A removed member cannot download an existing household export.
- Download URL/token is short-lived and never exposed in ordinary list APIs or logs.
- Retries do not create duplicate exports or corrupt job/detail status.
- Annual export targets the previous calendar year in `Asia/Kolkata`, uses the expected folder/filename structure, and handles partial failures.

## 6. Acceptance gates

Do not consider the artifact implementation-ready until:

1. All P0 cases have executable tests.
2. Every P0/P1 test has a named owner and a reproducible fixture.
3. SQL function/RPC names match the finalized schema/API artifacts.
4. Concurrency tests run with separate database sessions.
5. Tests execute against a disposable local Supabase stack and results are recorded.
6. Negative tests prove denial (not just that the UI hides controls).
7. A clean test run and security review are recorded before any production deployment.

## Reconciled decision coverage

Add explicit test groups for household-user category scope isolation and duplicate category labels across scopes; recipient-specific annual Drive export authorization; idempotency replay/fingerprint conflict with at least 24-hour terminal retention; and mixed cursor/page-number pagination. The test plan remains unexecuted and requires a disposable database plus mocked Drive storage.

## Reconciliation scenarios to include (not executed)

- Household join: new member's category scope becomes visible in the household; existing category IDs and transaction references remain unchanged.
- Household leave/removal: former member loses access to other members' category scopes and household records; own personal scope remains accessible.
- Duplicate category labels across scopes: both records remain distinct and UI disambiguates by owner; no implicit merge occurs.
- Direct client writes to `workspace_category_scopes`, `category_scope_members`, background job details, idempotency records, and tombstones are denied.
- Two simultaneous linked-refund creates cannot exceed the expense's remaining refundable amount.
- Export delivery and annual export jobs are recipient-isolated and use private Drive files; download authorization is rechecked.
- Replaying an idempotency key with the same request returns the original result; a different request with the same key returns `409 IDEMPOTENCY_KEY_REUSED`.
- Pagination rejects mixed cursor/page-number parameters and handles stable sort/filter-bound cursors.
- Purge/recovery is idempotent and tombstones prevent backup resurrection.

## Schema and authorization cases to add

- Verify every application table has RLS enabled, intended grants, and a policy/action result for `anon`, an active workspace member, a removed former member, and an unrelated authenticated user.
- For each workspace-scoped table, test `SELECT`, `INSERT`, `UPDATE`, and `DELETE` using both allowed and foreign workspace IDs. Test changing a row's `workspace_id`, `created_by_user_id`, `deleted_by_user_id`, `purge_after`, `role`, `is_builtin`, and other protected fields.
- Verify invitation rows do not expose `token_hash` or unapproved invitee data; deny direct reads/writes of idempotency, export/backup details, and tombstones. Allow audit reads only to authorized workspace members and deny audit writes to ordinary clients.
- Test profile self-read and display-name-only update, invitation expiry/revocation/single-use behavior, owner-only visibility changes, and removed-member denial after removal while the same session remains active.
- Test category type compatibility, workspace-to-scope mapping, cross-scope name collisions, category creation/rename/archive/restore, category purge with active and trashed references, and a transaction referencing a scope not linked to its workspace.
- Test every composite FK: transaction-label same-workspace, refund-expense same-workspace, tracker-transaction same-workspace/tracker, and tracker-refund same tracker. Also test `ON DELETE` effects are limited to the approved purge path.
- Test future-month budget insertion directly as `authenticated`, current-month creation, duplicate workspace/month, past correction, and IST month boundary behavior.
- Test job/detail mismatch on detail insert/update and parent job type change, plus missing/duplicate detail cardinality at the agreed transaction boundary.
- The business pgTAP draft checks immediate child type mismatches. `deferred_export_*_commit.psql` scripts change parent job type/workspace or remove required detail and assert SQLSTATE `23514` at actual commit.
- `003_future_object_defaults.pgtap.sql` creates a rolled-back probe table/function as the migration-creating role. It checks default client ACLs, records that PostgreSQL does not enable RLS automatically, then verifies an explicitly RLS-enabled default-deny probe for both `anon` and `authenticated`. Run under each approved object-creating role.
- Test updated-at triggers and exact soft-delete metadata/retention behavior, including whether profile deletion can satisfy workspace-owner invariants after lifecycle cleanup.
- Test current-month budget insertion and future-month rejection against a single captured `Asia/Kolkata` clock value; existing past-month rows are updated, not inserted/upserted.
- Test exactly 30-day retention with fixed `deleted_at` values; reject 29-day and 31-day `purge_after`, and verify restore clears both deletion timestamp and purge deadline.
- Test the RLS draft's narrow invitation projection, no authenticated `DELETE` on every Trash-managed table, protected-column update denial, current-month budget insert guard, linked category-scope access, and default-deny for unlinked scopes.
- Replace the self-comparison built-in-category assertion in `001_rls_authorization.pgtap.sql` with an assertion against a known seeded built-in ID/count. Replace the non-member proxy case with a user who was active and then removed.

## Refund atomicity and concurrency cases

- For ordinary and tracker refunds, cover linked and unlinked create; partial refunds summing exactly to the expense; rejection one paise over; update amount up/down; changing the linked expense; linking an existing unlinked refund; reducing an expense below its active refund sum; and soft-delete/restore capacity changes.
- For concurrency, use a fixed expense of `1000.00` and two sessions attempting `600.00` and `500.00` linked refunds at a barrier. Assert one write is rejected or retried and the committed active sum never exceeds `1000.00`. Repeat for tracker transactions.
- Race an expense amount reduction to `500.00` against a linked refund of `600.00` on a `1000.00` expense. Depending on lock order, either the reduction or refund must fail; no committed state may have active refunds above the expense amount. Repeat for tracker transactions.
- Race soft-deleting/restoring an expense and its linked refunds against refund creation. The trusted lifecycle operation must commit all parent/child state changes or none; no active refund may remain attached to a trashed expense.
- Verify rollback leaves neither partial refund rows nor altered idempotency results. A trigger-level lock pattern is not considered verified until these tests run against the final PostgreSQL/Supabase version.
- For job details, test parent and child type/workspace changes, missing detail at commit, duplicate detail rejection, valid queue-plus-detail creation in one transaction, and parent deletion with cascading detail cleanup.

## Two-session scripts

The `tests/concurrency/` session pairs hold the original row lock in Session A and pause at an interactive psql prompt. Start Session B and confirm its lock wait in `pg_stat_activity` before allowing A to commit. The ordinary refund, tracker refund, and expense-edit pairs assert the losing operation is rejected and the aggregate remains within the approved amount. Trash/restore pairs use database-owner SQL to exercise trigger locking only; they do not stand in for the missing trusted lifecycle procedure or verify its authorization/audit behavior. Purge remains blocked until that procedure and its API contract are approved; do not test purge with direct `DELETE` because the draft FK detaches linked refunds.

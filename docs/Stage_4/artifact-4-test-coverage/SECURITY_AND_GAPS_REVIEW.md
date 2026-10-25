# Security and test-gap review

## Overall status

**Not yet release-ready.** This artifact defines expected coverage and a draft test harness. No tests have run, and the prior SQL/RLS artifacts still require reconciliation.

## Static Design Findings

Baseline findings recorded before the 25 October draft fixes. Current dispositions follow the table. No SQL was executed. Severity uses the P0/P1/P2 definitions in `TEST_STRATEGY.md`.

| ID      | Severity | Finding and evidence                                                                                                                                                                                                                                                                                                                                                                                                            | Required fix before implementation readiness                                                                                                                                                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-01   | P0       | `../artifact-3-rls/policies/001_rls_policies.sql` grants authenticated users direct `DELETE` and broad `UPDATE` on transactions, savings funds/transactions, trackers, tracker transactions, and labels. Physical deletes bypass Trash/audit workflows; deleting an expense can set linked refunds unlinked, and deleting a fund cascades its transactions. Broad updates also expose workspace and deletion metadata fields.   | Remove direct client hard-delete and protected-field mutation paths. Use narrowly scoped writes for lifecycle transitions, keep 30-day Trash/purge behavior atomic, and test denied direct writes plus approved RPC behavior for each resource. |
| SEC-01  | P1       | The same RLS draft grants full-row `SELECT` on `workspace_invitations` to active members; the row includes `token_hash` and `invitee_email`. RLS filters rows, not columns.                                                                                                                                                                                                                                                     | Expose only approved invitation fields through column-level grants, a safe view, or a trusted endpoint. Test that ordinary clients cannot retrieve the hash.                                                                                    |
| SEC-02  | P1       | The active category policies use `is_category_scope_member`, which checks only `category_scope_members`. `workspace_category_scopes` has no client read policy/grant, and the proposed linked-workspace helper is only a comment after `COMMIT` in `../artifact-3-rls/policies/001_rls_policies.sql`.                                                                                                                           | Reconcile and integrate the scope-to-workspace authorization helper and category-assignment check. Test linked-scope access for household members and denial for unrelated users and unlinked scopes.                                           |
| DB-02   | P1       | Authenticated users have direct `INSERT` on `monthly_budgets`; `../artifact-2-postgres/migrations/001_tables.sql` checks only that `month_start` is the first day, not that a new budget is for the current IST month. The API contract's future-month rejection can be bypassed through direct table access. `../artifact-3-rls/policies/001_rls_policies.sql` grants the insert.                                              | Enforce current-month creation at a database-protected boundary or remove direct client inserts in favor of a trusted write path. Test current, past, and future month boundaries in `Asia/Kolkata`.                                            |
| DB-03   | P1       | `../artifact-2-postgres/migrations/003_integrity_functions.sql` validates export/backup job type when a detail row is inserted or updated, but does not protect a later `background_jobs.job_type` change or require the compatible detail row to exist.                                                                                                                                                                        | Enforce both directions and required detail cardinality transactionally, or document the precise trusted boundary. Test mismatches on insert, update, and commit.                                                                               |
| SEC-03  | P1       | `REVOKE ALL ON ALL TABLES` covers only existing tables. The draft now revokes future table/function grants for the role executing the RLS script, but other object-creating roles may differ; PostgreSQL also does not automatically enable RLS on new tables.                                                                                                                                                                  | Verify effective defaults for every migration creator and test a future table/function under each. Require explicit RLS enablement and policies in every new-table migration.                                                                   |
| SEC-04  | P2       | `shares_active_workspace_with(uuid)` is `SECURITY DEFINER` and executable by `authenticated`; callers can probe whether arbitrary user IDs share an active workspace. It is not used by the active policies.                                                                                                                                                                                                                    | Revoke client execution unless a reviewed endpoint needs it, or narrow its observable inputs/results. Add a privacy regression test.                                                                                                            |
| DB-04   | P2       | The `set_updated_at` trigger list in `../artifact-2-postgres/migrations/003_integrity_functions.sql` omits `labels`; `deletion_tombstones` is already included. Soft-delete checks only require `purge_after >= deleted_at`, not the approved 30-day interval.                                                                                                                                                                  | Include all timestamped tables and enforce the approved retention interval only through a reviewed trusted lifecycle path; add update and retention-boundary tests.                                                                             |
| API-01  | P1       | `../artifact-5-api-contracts/API_CONTRACTS.md` contains 70 method/path entries; `../artifact-5-api-contracts/openapi.yaml` has 10 path templates and 17 operations. It omits most workspace lifecycle, category, savings, tracker, Trash/audit, report, settings, and account routes. The OpenAPI description claims YAML syntax parses, while `../artifact-5-api-contracts/TEST_STATUS.md` says syntax validation was not run. | Reconcile every route/method and schema, remove the unsupported syntax-validation claim or validate it, then record semantic and schema validation results.                                                                                     |
| TEST-01 | P1       | `../artifact-3-rls/tests/001_rls_authorization.pgtap.sql` uses fixture placeholders. Its built-in-category assertion compares the same query to itself, and the “removed member” case checks a user who was never a member. `tests/001_business_logic_pgtap.draft.sql` has only five executable assertions; refund concurrency cases are comments.                                                                              | Use the deterministic fixture design and minimum cases in `TEST_STRATEGY.md`; keep two-session concurrency outside a single pgTAP transaction and bind all assertions to final schema/function names.                                           |

## Draft Fix Status (25 October 2026)

| ID      | Status          | Draft change and remaining risk                                                                                                                                                                                                                                                                                           |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-01   | Partially fixed | Artifact 3 now denies authenticated hard deletes and limits update columns on soft-deletable finance tables. Trusted Trash/restore/purge procedures are not implemented here; `service_role` still bypasses RLS by design and must remain server-only. No database tests ran.                                             |
| SEC-01  | Fixed in draft  | Invitation `SELECT` is column-limited and omits `token_hash`. The authorization test asserts hash access is denied; verify it in the disposable database.                                                                                                                                                                 |
| SEC-02  | Fixed in draft  | The active scope helper includes direct scope membership or membership in a workspace linked to the scope; mapping reads are workspace-scoped; transaction category triggers check scope linkage. Tests remain unrun.                                                                                                     |
| DB-02   | Fixed in draft  | A `BEFORE INSERT` trigger accepts only the current `Asia/Kolkata` month. Existing past rows must use `UPDATE`; an `INSERT ... ON CONFLICT` upsert for a past month will still hit the insert guard.                                                                                                                       |
| DB-03   | Fixed in draft  | Immediate child checks remain, with deferred parent/child checks for detail type and cardinality at transaction end. Validate parent changes, missing detail, replacement, and cascade cases.                                                                                                                             |
| SEC-03  | Partially fixed | Default table/function ACL revokes now cover the role executing the RLS script. Verify other object-creating roles; PostgreSQL does not auto-enable RLS, so every future table still needs explicit enablement and policy review.                                                                                         |
| SEC-04  | Fixed in draft  | `shares_active_workspace_with(uuid)` is no longer executable by authenticated or service roles. Verify function ACLs in the disposable database.                                                                                                                                                                          |
| DB-04   | Fixed in draft  | `labels` is included in `set_updated_at`; `deletion_tombstones` was already included. Ordinary Trash triggers now require exactly 30 days. Verify all six trigger targets and 29/30/31-day cases.                                                                                                                         |
| API-01  | Partially fixed | OpenAPI now declares 70 operations matching the 70 catalogue entries. Generic response schemas and `x-contract-gap` markers remain where the catalogue lacks field details; no OpenAPI validator was run.                                                                                                                 |
| API-02  | Unresolved      | The category request uses `compatible_types`, while SQL stores `category_type` (`ordinary`/`tracker`); API tracker creation includes `description`, but `public.trackers` has no such column. Do not resolve these by silently changing product or schema semantics.                                                      |
| TEST-01 | Partially fixed | Fixed-ID public setup/cleanup, a loopback-guarded runner, future-object probes, deferred COMMIT tests, and two-session refund/edit/Trash/restore scripts now exist. Five synthetic `auth.users` still require a version-pinned local helper; purge concurrency is blocked on its missing trusted operation. No tests ran. |

## Readiness Decision

**Not security-verified or production-ready.** The SQL remains unapproved draft material. Public fixture setup/cleanup, a loopback-guarded runner, deferred COMMIT probes, and two-session scripts are now drafted, but five synthetic Auth users still require a version-pinned local helper. The linked-refund triggers contain parent-row locks and aggregate checks; no concurrent database test has run. Trusted Trash/restore/purge procedures remain absent, and purge concurrency is blocked. Continue only with separately approved disposable-database validation; do not apply these drafts as migrations.

## Blocking gaps

### 1. Business operations need transactional contracts

The drafts contain a trigger-based linked-refund lock-and-cap pattern, but it has not been validated under concurrency. The schema/RLS drafts do not by themselves fully implement:

- Atomic expense-plus-refunds Trash transitions.
- Workspace/account deletion and restoration cascades.
- Permanent purge with tombstone reconciliation.
- Secure export creation, worker execution, and download authorization.
- Ownership transfer with exactly one active owner.
- Annual export orchestration and retry semantics.

These multi-row lifecycle operations need narrowly scoped server-only RPCs or trusted service operations with explicit contracts. Test the refund triggers against the API's create/update and idempotency behavior; add a trusted routine only if the finalized transaction contract requires more than the trigger-protected statement. Do not solve these by granting broad table access to clients.

### 2. RLS policy review

- D1 is resolved: custom categories use per-user scopes linked to the owner’s Personal workspace and all active members of the Shared Household workspace. Add negative tests proving unrelated authenticated users cannot read or mutate those custom categories; built-ins remain globally readable.
- Ensure `profiles` does not leak personal data; updates are column-limited to `display_name`.
- Check helper functions use `SECURITY DEFINER` only where required, a fixed safe `search_path`, and narrow `EXECUTE` grants.
- Ensure `service_role` credentials never reach browser/mobile clients.
- Test as `authenticated` and anonymous roles, not only as database owner.
- Consider `FORCE ROW LEVEL SECURITY` only after validating migration/worker ownership and operational needs.
- Ensure direct client grants and RLS policies agree. A policy cannot grant access that SQL privileges do not grant, and a grant alone must not bypass RLS.
- Verify the approved household membership model (>2 active members permitted, exactly one active owner) is enforced by the final schema and tested under authenticated roles.

### 3. Schema/policy inconsistencies to reconcile

- The RLS draft must enforce household-user category-scope membership and case-insensitive name uniqueness within the scope; built-in names remain globally reserved.
- Category deletion via `ON DELETE SET NULL` must always set `needs_category_correction = true` in the same transaction for affected active or trashed transactions.
- `savings_transactions` references `fund_id`; workspace authorization must be enforced through the parent fund and verified with tests.
- Export download authorization must be checked at download time, not inferred from export creation.
- Queue status is the sole lifecycle source of truth; tests must verify export/backup detail rows cannot independently set or diverge from queue status.
- Soft-delete visibility should be enforced consistently in normal queries/views and export workers, not solely by frontend filtering.

### 4. Test harness gaps

- Existing pgTAP scripts use fixture placeholders; a deterministic fixture setup/teardown is needed.
- Static schema review remains open for exact table/column/constraint/function names and migration ordering; draft SQL is not ready to apply.
- RLS/grant review remains open for every table and operation, including default privileges and narrowly granted helper/transactional functions.
- Linked-refund create/update has a trigger-based lock-and-check pattern; verify it with a two-session concurrency test. Add a trusted routine only if the finalized API/idempotency contract requires more than the trigger-protected statement.
- OpenAPI remains a representative subset; expand it to the complete route catalogue and validate the document and referenced schemas.
- Test transaction rollback behavior and SQLSTATEs after exact functions/policies are finalized.
- Concurrency tests need two independent database sessions.
- Time-based recovery/expiry tests should use injectable clock arguments or fixed timestamps, not sleeps.
- Worker tests need a fake storage/Drive provider and deterministic retries.
- Test logs and fixtures must contain no real personal or financial data.

## Go/no-go gates

Before any deployment:

1. Reconcile all SQL table/function/policy names.
2. Implement and test transactional RPC contracts.
3. Run the full suite against a disposable local Supabase stack.
4. Record exact versions, command lines, and test results.
5. Verify every P0 test passes and no P0 case remains unimplemented.
6. Review RLS with a second-person security review.
7. Only then consider staging deployment; production is a separate approval.

## Reconciled owner decisions — additional test requirements

- Category scope: a scope member can read/use the custom categories shared by that scope across Personal and Shared Household workspaces; an unrelated authenticated user cannot read, create into, mutate, or delete that scope’s custom categories. Built-ins remain globally readable. Scope merge on household join must handle duplicate normalized names safely.
- Annual Drive export: two household members receive independently authorized exports to their own Drive destinations; one user cannot access the other user’s credentials, destination token, or private links. Removing a member before generation/delivery must be handled according to current authorization.
- Idempotency: same key + same fingerprint replays the stored result; same key + different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`; terminal results remain replayable for at least 24 hours; pending jobs do not expire early.
- Pagination: cursor endpoints reject malformed/filter-mismatched cursors; page-number endpoints validate page and limit; both enforce default 20 and max 100.

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

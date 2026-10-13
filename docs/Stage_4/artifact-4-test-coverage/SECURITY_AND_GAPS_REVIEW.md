# Security and test-gap review

## Overall status

**Not yet release-ready.** This artifact defines expected coverage and a draft test harness. No tests have run, and the prior SQL/RLS artifacts still require reconciliation.

## Blocking gaps

### 1. Business operations need transactional contracts

The current schema/RLS drafts do not by themselves fully implement:
- Refund row locking and cap enforcement under concurrency.
- Atomic expense-plus-refunds Trash transitions.
- Workspace/account deletion and restoration cascades.
- Permanent purge with tombstone reconciliation.
- Secure export creation, worker execution, and download authorization.
- Ownership transfer with exactly one active owner.
- Annual export orchestration and retry semantics.

These must be implemented as narrowly scoped server-only RPCs or trusted service operations with explicit contracts. Do not solve these by granting broad table access to clients.

### 2. RLS policy review

- D1 is resolved: custom categories use per-user scopes linked to the owner’s Personal workspace and all active members of the Shared Household workspace. Add negative tests proving unrelated authenticated users cannot read or mutate those custom categories; built-ins remain globally readable.
- Ensure `profiles` does not leak personal data; updates are column-limited to `display_name`.
- Check helper functions use `SECURITY DEFINER` only where required, a fixed safe `search_path`, and narrow `EXECUTE` grants.
- Ensure `service_role` credentials never reach browser/mobile clients.
- Test as `authenticated` and anonymous roles, not only as database owner.
- Consider `FORCE ROW LEVEL SECURITY` only after validating migration/worker ownership and operational needs.
- Ensure direct client grants and RLS policies agree. A policy cannot grant access that SQL privileges do not grant, and a grant alone must not bypass RLS.

### 3. Schema/policy inconsistencies to reconcile

- The RLS draft must enforce household-user category-scope membership and case-insensitive name uniqueness within the scope; built-in names remain globally reserved.
- Category deletion via `ON DELETE SET NULL` must always set `needs_category_correction = true` in the same transaction for affected active or trashed transactions.
- `savings_transactions` references `fund_id`; workspace authorization must be enforced through the parent fund and verified with tests.
- Export download authorization must be checked at download time, not inferred from export creation.
- Queue status is the sole lifecycle source of truth; tests must verify export/backup detail rows cannot independently set or diverge from queue status.
- Soft-delete visibility should be enforced consistently in normal queries/views and export workers, not solely by frontend filtering.

### 4. Test harness gaps

- Existing pgTAP scripts use fixture placeholders; a deterministic fixture setup/teardown is needed.
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

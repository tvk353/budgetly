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

| Layer | Purpose | Suitable cases |
|---|---|---|
| PostgreSQL constraints | Reject invalid persisted states | Amount precision/range, required fields, unique month budget, composite tracker FK, category correction flag |
| pgTAP + RLS | Validate row visibility and permitted writes as `authenticated` | Workspace isolation, member parity, removed-member denial, direct client privilege denial |
| Transactional database/RPC tests | Verify multi-row atomicity and invariants | Refund caps, owner transfer, cascade soft-delete/restore, purge idempotency |
| API integration | Verify identity, validation, status codes, response filtering | Export creation, invite/recovery flows, pagination, auth failure |
| Multi-session concurrency | Verify race conditions | Simultaneous linked refunds, two budget creates, concurrent owner transfer and removal |
| Worker integration | Verify asynchronous workflows | Export retries, failed jobs, backup reconciliation, cleanup retries |
| UI tests (later) | Confirm useful interaction and error handling | Correction prompts, budget display, restore flows |

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

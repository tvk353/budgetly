# Budgetly — Stage 4, Artifact 4

## Authorization and Business-Logic Test Coverage Review

**Status:** Test-design baseline complete; executable verification is deferred to the implementation-readiness gate.  
**Scope:** Authorization, refunds, budgets, deletion/recovery, exports, and related integrity boundaries.  
**Execution status:** Not run. No database was connected to or changed. No migrations were applied.

This artifact follows the reconciled ERD, PostgreSQL design, and RLS/authorization design. It defines required test coverage; it is not evidence that SQL or policies currently pass.

## Package contents

- `TEST_STRATEGY.md` — layers, fixtures, test conventions, priorities, and acceptance gates.
- `matrices/coverage_matrix.csv` — traceable test cases, expected results, priority, and suggested test layer.
- `matrices/coverage_matrix.md` — readable coverage summary.
- `tests/001_business_logic_pgtap.draft.sql` — pgTAP-style draft for database constraints and invariants; requires a fixture harness and final RPC/function names.
- `tests/002_api_integration_scenarios.md` — API-level scenarios, especially workflows that cannot be proved by RLS alone.
- `SECURITY_AND_GAPS_REVIEW.md` — unresolved issues and go/no-go criteria before running tests.

## Important

1. The schema, RLS, and function artifacts remain non-executed design files. Before execution, verify exact object names and bind the synthetic fixture harness to the finalized functions.
2. The test SQL deliberately includes harness placeholders where the schema does not yet define a stable public function contract.
3. Concurrent refund limits, ownership transfer, export download authorization, and deletion/recovery require multi-session or API integration tests; a single-session pgTAP test is insufficient.
4. Test only in a disposable local Supabase/PostgreSQL environment with synthetic fixtures. Never point this suite at production data.
5. No SQL in this package has been executed.

## Reconciliation update — 12 October 2026

Product-owner decisions incorporated: custom categories use household-user scope (not app-wide); annual Google Drive exports are generated independently for each authorized user into that user’s own Drive; idempotency results are retained for at least 24 hours after terminal completion; pagination is mixed by endpoint (cursor for transactions/history, page-number for simple lists/reports; default 20, maximum 100). Background job lifecycle status is owned by `background_jobs`. This remains design-only: no tests were executed and no migrations/database changes were made.

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

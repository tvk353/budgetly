# Budgetly — Stage 4 Completion and Stage 5 Handoff

**Decision:** Stage 4 is complete for design and documentation. Stage 5 UI/UX may begin next.

## Completed in Stage 4

- ERD and relational model covering workspaces, household membership, transactions/refunds, budgets, savings, trackers, categories, audit, jobs, exports, backups, idempotency and deletion tombstones.
- PostgreSQL table/index/integrity-function design and a staged migration plan.
- Supabase RLS and server-side authorization design.
- Security/business-logic test matrix and integration test strategy.
- Human-readable `/api/v1` route catalogue, validation/error conventions, pagination/idempotency rules, example payloads and a representative OpenAPI draft.
- All product decisions D1–D4 and low-complexity defaults D5–D14 recorded in the reconciliation.

## Stage 5 design inputs

- Custom category picker must show categories from the selected workspace's linked scopes. Same-named categories from different owners remain distinct and can show an owner label.
- Transaction and history lists use cursor pagination; bounded categories/funds/trackers/reports use page-number pagination.
- Restored transactions whose category was permanently deleted need a visible correction state.
- Refund UI may show remaining refundable amount, but the server/database remains authoritative.
- Design empty, loading, error, hidden, ended, Trash, restore, permanent-delete, export pending/failed/completed, and access-denied states.
- Exports are private and user-specific; downloading requires authentication and a current authorization check.
- Preserve mobile-first, iOS-inspired responsive web/PWA direction and the approved Budgetly visual identity.

## Not performed

- No tests executed.
- No migrations applied.
- No database connected to or changed.
- No secrets, Drive OAuth, SMTP, cron or deployment integrations configured.
- No Stage 6 scaffold started.

## Before implementation (later gate)

1. Expand OpenAPI to every endpoint in `artifact-5-api-contracts/API_CONTRACTS.md` and validate the document/schemas.
2. Perform static SQL/RLS/grant review against exact object names and transaction semantics.
3. Complete the pgTAP fixture harness and replace placeholders.
4. After separate explicit approval, execute tests in a disposable local Supabase/PostgreSQL environment and record results.
5. Review migration/rollback steps and verified recovery before applying migrations.

These are implementation-readiness checks, not unresolved product choices and not blockers to Stage 5 UI/UX design.

## Addendum — reusable transaction labels

Stage 5 UI should include an optional Label field after Category in Add Expense. Users can select an existing workspace label or create one. Labels are reusable across categories and isolated by workspace. Include loading, empty, create, duplicate-name, and error states. This design addendum does not authorize applying a database migration.

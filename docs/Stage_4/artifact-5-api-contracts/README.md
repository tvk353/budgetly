# Budgetly — Stage 4, Artifact 5: Detailed API Contracts

**Status:** Human-readable API contract baseline complete; OpenAPI machine-readable coverage is a draft and must be expanded/validated before implementation.  
**Scope:** Next.js modular monolith API contracts for Budgetly.  
**Safety:** These are specification files only. No tests were run against a database, no migrations were applied, and no database was changed.

## Package contents

- `API_CONTRACTS.md` — conventions, endpoint catalogue, detailed contracts, validation and status codes.
- `schemas/common-schemas.yaml` — reusable JSON Schema 2020-12 request/response schemas.
- `openapi.yaml` — OpenAPI 3.1 draft for the primary API surface. The full human-readable route catalogue is in `API_CONTRACTS.md`; expand OpenAPI to every route and validate it before implementation.
- `examples/` — representative success and error payloads.
- `REVIEW_CHECKLIST.md` — decisions and consistency checks required before implementation.

## Important contract rules

1. All endpoints are versioned under `/api/v1`.
2. JSON amounts are decimal strings (for example `"123.45"`) to avoid floating-point ambiguity.
3. The server derives the actor from the authenticated session; clients never submit an actor ID as authority.
4. Every workspace-scoped operation checks current membership and workspace status server-side and is additionally protected by RLS.
5. Authorization failures should not leak whether an inaccessible resource exists; use `404` where appropriate.
6. These contracts do not authorize direct database access from the client or bypass RLS.


## Reconciliation update — 12 October 2026

Product-owner decisions incorporated: custom categories use household-user scope (not app-wide); annual Google Drive exports are generated independently for each authorized user into that user’s own Drive; idempotency results are retained for at least 24 hours after terminal completion; pagination is mixed by endpoint (cursor for transactions/history, page-number for simple lists/reports; default 20, maximum 100). Background job lifecycle status is owned by `background_jobs`. This remains design-only: no tests were executed and no migrations/database changes were made.

# Budgetly — Stage 4, Artifact 3

## Supabase RLS policies and authorization design (DESIGN COMPLETE — SQL NOT EXECUTED)

This package defines a proposed Supabase authorization layer for the approved Budgetly ERD and schema draft.

**No SQL was applied. No database was connected to or changed.** All SQL is review material only.

### Files

- `policies/001_rls_policies.sql` — helper functions, RLS enablement, policies, and grants.
- `tests/rls_authorization_matrix.md` — expected access matrix and test coverage.
- `tests/001_rls_authorization.pgtap.sql` — pgTAP-style integration test draft.
- `SECURITY_REVIEW.md` — critical assumptions, risks, and decisions required before execution.
- `IMPLEMENTATION_NOTES.md` — recommended transaction/RPC boundaries and test workflow.

### Preconditions

1. Artifact 2 schema migrations are still a draft. Review column names and table constraints against the current SQL before using this file.
2. Apply only to a disposable Supabase local/test project after the schema and this artifact are approved.
3. The test draft assumes pgTAP is enabled in the test database and uses `SET LOCAL ROLE authenticated` plus `request.jwt.claim.sub` to simulate JWT identity.
4. `service_role` is privileged and must never be used from a browser/mobile client.
5. RLS is not a replacement for input validation, business rules, secure RPC functions, or database constraints.

### High-level authorization

- Workspace data is readable/writable only by active members of a non-deleted workspace.
- Workspace membership and ownership are checked through tightly scoped `SECURITY DEFINER` helpers to avoid recursive RLS.
- Built-in categories are globally readable. Custom categories are readable only to members of their household-user category scope, shared across those users’ Personal and Shared Household workspaces; unrelated Budgetly users cannot read them. Custom category mutations use trusted server/RPC operations.
- Audit logs, job queue, backup runs, deletion tombstones, and deletion lifecycle status are not client-writable.
- Export request creation must go through a trusted server/RPC boundary because it creates coordinated `background_jobs` and `export_jobs` rows.
- Data export output is readable only by the requesting user after server-side authorization. The app should issue a short-lived signed URL only after checking requester identity and current workspace membership.

### Important

The cross-artifact design decisions are recorded in the Stage 4 reconciliation. The policies remain non-executed SQL and must be checked against the finalized DDL and tested in a disposable environment before implementation approval.

## Reconciliation decisions (12 October 2026)

- D1: custom categories are household-user scoped, not app-wide; built-ins remain global.
- D2: annual exports are per-user and go to each recipient’s own authorized Google Drive destination.
- D3: idempotency records are server-only and retained at least 24 hours after terminal completion.
- D4: pagination is mixed by endpoint; this does not change RLS but list authorization remains workspace/scope-based.
- Job lifecycle status is authoritative in `background_jobs`; export/backup detail tables must not independently mutate status.

## Reconciliation update — 12 October 2026

Product-owner decisions incorporated: custom categories use household-user scope (not app-wide); annual Google Drive exports are generated independently for each authorized user into that user’s own Drive; idempotency results are retained for at least 24 hours after terminal completion; pagination is mixed by endpoint (cursor for transactions/history, page-number for simple lists/reports; default 20, maximum 100). Background job lifecycle status is owned by `background_jobs`. This remains design-only: no tests were executed and no migrations/database changes were made.

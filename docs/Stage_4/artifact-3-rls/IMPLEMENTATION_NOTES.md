# Implementation notes

## Policy design principles
- Enable RLS on every public table.
- Use explicit grants plus RLS; RLS policies alone do not grant privileges.
- Use `auth.uid()` as the identity source for authenticated requests.
- Keep workspace mutation and membership lifecycle operations behind transaction-safe RPCs.
- Do not expose the Supabase `service_role` key to any client.
- Keep operational tables server-only.
- Use fixed `search_path` and schema-qualified references in `SECURITY DEFINER` functions.

## Recommended RPC boundaries (not implemented here)
1. `create_personal_workspace(...)`: atomically create workspace + owner membership.
2. `create_household_workspace(...)`: atomically create workspace + owner membership.
3. `invite_workspace_member(...)`: validate membership/permissions, normalize email, store token hash, enforce expiry and rate limits.
4. `consume_workspace_invitation(...)`: verify single-use token and verified email, insert membership and set joined timestamp atomically.
5. `transfer_workspace_ownership(...)`: re-authenticate, lock workspace/membership rows, switch roles in one transaction.
6. `remove_workspace_member(...)`: owner-only, prevent removal of sole owner, revoke sessions/access as applicable.
7. `request_account_deletion(...)` / `recover_account(...)`.
8. `request_workspace_deletion(...)` / `recover_workspace(...)`.
9. `request_export(...)`: validate workspace access and date range, create background_jobs + export_jobs atomically.
10. `restore_trash_record(...)` / `purge_trash_record(...)`: allowlisted record types, workspace check, related-record semantics, audit atomically.
11. `create_linked_refund(...)`: lock original expense row and enforce cumulative refund cap under concurrency.
12. `write_audit_event(...)`: callable only by trusted triggers/server routines.

## Testing sequence
1. Run Artifact 2 schema in a disposable local Supabase/Postgres instance.
2. Apply this RLS policy draft to that disposable instance.
3. Run pgTAP tests and add fixtures for two unrelated households, a multi-member household, a Personal workspace, a removed member, and a non-member.
4. Add negative tests for every table and every action, not only SELECT.
5. Test RPCs using concurrent sessions for refunds, invitation consumption, and owner transfer.
6. Review query plans for membership helper functions and add indexes if necessary.
7. Only then revise the final migration bundle. Never test destructive operations on production.


## Reconciliation decisions (12 October 2026)

- D1: custom categories are household-user scoped, not app-wide; built-ins remain global.
- D2: annual exports are per-user and go to each recipient’s own authorized Google Drive destination.
- D3: idempotency records are server-only and retained at least 24 hours after terminal completion.
- D4: pagination is mixed by endpoint; this does not change RLS but list authorization remains workspace/scope-based.
- Job lifecycle status is authoritative in `background_jobs`; export/backup detail tables must not independently mutate status.


## Low-complexity implementation baseline

Use Next.js server route handlers plus a small set of transactional PostgreSQL functions; do not introduce another backend service. Functions are required only for operations that need atomicity or protected lifecycle transitions. All browser traffic uses the authenticated role and RLS; service-role credentials remain server-only. Category-scope membership and workspace-scope links are managed by trusted functions, not client updates.

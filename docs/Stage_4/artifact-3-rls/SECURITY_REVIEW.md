# Stage 4 Artifact 3 — Security Review and Implementation Gates

**Design status:** Reconciled with the Stage 4 completion baseline.  
**Execution status:** RLS SQL has not been executed or tested; no database was connected to or changed.

## Final security decisions

1. **Category scope:** Custom categories use per-user category scopes. A personal workspace links to its owner's scope; a household workspace links to every active member's scope. Built-ins are globally readable; custom categories are not app-wide. Names are unique case-insensitively within scope; built-in names are reserved globally. No category rows are merged when membership changes.
2. **Privileged operations:** Next.js server route handlers are the primary application layer, with narrow transactional PostgreSQL functions for cross-row atomicity and lifecycle transitions. The service-role key remains server-only.
3. **RLS and grants:** Review grants and RLS together. Deny direct client writes to membership/role fields, category scope links, job/detail tables, idempotency records, tombstones, audit logs, and account/workspace lifecycle transitions.
4. **Category deletion:** The before-delete guard rejects permanent deletion when active transaction references exist. If only trashed records reference the category, the trigger sets those references to NULL and sets `needs_category_correction=true` in the same delete transaction. This behavior requires a test before implementation approval.
5. **Workspace creation and ownership:** Create a workspace and its initial owner membership in one transaction so deferred ownership invariants are satisfied. Owner transfer and member removal are trusted transactional operations.
6. **Refunds:** Linked refund writes lock the original expense, calculate active linked refunds, validate the remaining refundable amount, and write within one transaction. The client never computes the authoritative remaining amount.
7. **Jobs and exports:** `background_jobs` owns lifecycle status. Export and backup detail tables contain only task-specific data. Ordinary clients cannot query or write operational tables directly. Export downloads re-check requester identity and current workspace authorization.
8. **Drive credentials:** Per-user OAuth tokens remain encrypted server-side and never appear in logs, job metadata, or API responses. Drive files remain private; no public links.
9. **Audit logs:** Clients cannot write audit events. Trusted triggers/functions write safe metadata in the same transaction as the protected change. Never log OTPs, session tokens, invitation tokens, recovery proofs, Drive credentials, or signed URLs.
10. **Auth and invitations:** Do not expose `auth.users` to clients. Invitation join validates verified email/identity, expiry, revocation and single-use state through a trusted operation. Recovery never reactivates revoked invitations.

## Implementation-time verification checklist

- [ ] Verify all table grants, schema usage, default privileges, and function execution grants.
- [ ] Verify SECURITY DEFINER functions have fixed search paths, qualified objects, safe ownership, and least-privilege grants.
- [ ] Verify each RLS policy against the final SQL table/column names.
- [ ] Verify grants and RLS together for every table and operation; policies do not grant SQL privileges, and grants must not expose rows outside the intended policies.
- [ ] Test unrelated-user denial for custom category scopes and immediate access removal after household membership removal.
- [ ] Test the category delete guard for active references and trashed-reference correction.
- [ ] Test household membership beyond two active members, exactly-one-owner enforcement, and transactional membership changes.
- [ ] Run multi-session refund concurrency tests.
- [ ] Test export recipient isolation, private Drive destination, current authorization at download, and revoked-member denial.
- [ ] Test idempotency replay and mismatched request fingerprint behavior.
- [ ] Verify operational tables are inaccessible to `anon` and ordinary `authenticated` direct writes.
- [ ] Run all tests only in a disposable local Supabase/PostgreSQL environment after separate explicit approval.

These are verification gates, not open product decisions. This document does not authorize SQL execution, migration application, or deployment.

## Static RLS findings

The following findings describe the baseline before the current draft fixes; they are not runtime test results.

| Severity | Finding                                                                                                                                                                                                                                                                                                               | Required fix                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Authenticated users receive direct `DELETE` and broad `UPDATE` grants on soft-deletable financial tables. This permits hard deletion outside Trash and mutation of fields such as `workspace_id`, `deleted_by_user_id`, and `purge_after`; foreign-key cascades/set-null actions can alter related financial history. | Deny direct hard deletes and restrict protected columns. Require reviewed trusted operations for Trash, restore, purge, and cascades; test both privilege denial and atomic allowed behavior. |
| P1       | `workspace_invitations` grants full-row `SELECT`, exposing `token_hash` and invitee email to every active workspace member.                                                                                                                                                                                           | Replace with a safe column projection or server read path; prove token hashes are not readable by authenticated clients.                                                                      |
| P1       | Category scope access is incomplete: the active helper checks direct scope membership only; the mapping table has no read policy/grant; the linked-workspace helper is an unintegrated comment after the transaction commit.                                                                                          | Implement and test the approved linked-scope policy for category and scope reads, and enforce scope/workspace compatibility on writes.                                                        |
| P1       | Current-month budget creation is not protected against direct `INSERT`; RLS grants it and the table has no month-relative constraint/trigger.                                                                                                                                                                         | Enforce the rule in a trusted boundary and remove direct insert access if that boundary is server-only.                                                                                       |
| P1       | Baseline lacked default-privilege revokes for future public objects. The current draft adds table/function revokes for the role executing this script, but does not cover other object-creating roles or automatically enable RLS on future tables.                                                                   | Verify every migration creator is covered; test a new table/function under each role. Require explicit `ENABLE ROW LEVEL SECURITY` and policy review in every table-creating migration.       |
| P2       | `shares_active_workspace_with(uuid)` is callable by `authenticated` and acts as a user-relationship oracle; the active policies do not use it.                                                                                                                                                                        | Revoke or narrow client execution and add an enumeration/privacy test.                                                                                                                        |

The `SECURITY DEFINER` membership helpers reviewed here use an empty `search_path` and schema-qualified object references, and the draft revokes their execution from `PUBLIC` and `anon`. That is a useful safeguard, but it does not clear the findings above or substitute for grant, ownership, and role tests.

## Draft Disposition

These are static dispositions only; no RLS or grant behavior has been exercised against PostgreSQL.

| Severity               | Status          | Disposition and remaining risk                                                                                                                                                                                                                                                  |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0                     | Partially fixed | Authenticated direct hard deletes are removed for Trash-managed resources, and updates are column-limited. Trusted Trash/restore/purge operations are still absent from this SQL package; service-role code can bypass RLS and must remain server-only.                         |
| P1 invitation          | Fixed in draft  | Column-level `SELECT` excludes `token_hash`; safe invitation listing remains row-scoped to active workspace members. Run the denial test as `authenticated`.                                                                                                                    |
| P1 category scope      | Fixed in draft  | `is_category_scope_member` now includes active members of linked workspaces; `workspace_category_scopes` has a member-scoped read policy; transaction triggers reject custom categories whose scopes are not linked. Validate with two household members and an unrelated user. |
| P1 budget              | Fixed in draft  | A `BEFORE INSERT` trigger permits only the current IST month. The API must update existing past rows rather than upsert them. Verify current, past, future, and month-boundary cases.                                                                                           |
| P1 job detail          | Fixed in draft  | Deferred checks validate both parent job changes and child changes/cardinality at commit; child-side type checks remain immediate. Test valid atomic creation, mismatches, missing detail, and deletion cascades.                                                               |
| P1 defaults            | Partially fixed | Default table/function grants are revoked for the role executing this script. Verify effective defaults for every other migration/object owner; PostgreSQL does not auto-enable RLS, so every new table still needs explicit RLS and policies.                                  |
| P2 relationship oracle | Fixed in draft  | `shares_active_workspace_with(uuid)` has no client/service execution grant. Confirm function ACLs in the disposable database.                                                                                                                                                   |

Grant revocation prevents direct REST hard deletes, but does not implement the trusted lifecycle endpoints themselves. This distinction must remain visible until server/RPC code and database tests exist; no security property is verified by this documentation change.

## Label security checks

- Label RLS must scope every operation by active workspace membership.
- Composite FK `(workspace_id, label_id)` must reject cross-workspace references even if a client submits a valid UUID.
- Server handlers must trim names and handle case-insensitive duplicate conflicts without leaking data from other workspaces.
- No label endpoint may accept a caller-supplied workspace identity without checking current membership.

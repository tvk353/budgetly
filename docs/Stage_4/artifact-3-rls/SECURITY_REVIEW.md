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
- [ ] Test unrelated-user denial for custom category scopes and immediate access removal after household membership removal.
- [ ] Test the category delete guard for active references and trashed-reference correction.
- [ ] Test deferred workspace-owner constraints and transactional membership changes.
- [ ] Run multi-session refund concurrency tests.
- [ ] Test export recipient isolation, private Drive destination, current authorization at download, and revoked-member denial.
- [ ] Test idempotency replay and mismatched request fingerprint behavior.
- [ ] Verify operational tables are inaccessible to `anon` and ordinary `authenticated` direct writes.
- [ ] Run all tests only in a disposable local Supabase/PostgreSQL environment after separate explicit approval.

These are verification gates, not open product decisions. This document does not authorize SQL execution, migration application, or deployment.

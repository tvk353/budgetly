# Schema review checklist

Use this before approving or executing the migration package.

## Tables and core constraints
- [ ] Profiles use the Supabase Auth user UUID.
- [ ] Personal workspace cardinality and household owner invariants are correct.
- [ ] Household membership has no two-member cap.
- [ ] Invitation token is stored only as a hash.
- [ ] Custom category names are unique case-insensitively within category scope after trimming; unrelated users cannot read them.
- [ ] Built-in category names cannot be used by custom categories.
- [ ] Ordinary and tracker category types are enforced on assignment.
- [ ] Refunds are positive amounts and can optionally reference an expense.
- [ ] Linked refunds cannot cross workspaces or tracker boundaries.
- [ ] Linked refund total cannot exceed the original expense under concurrent writes.
- [ ] Budget uniqueness is `(workspace_id, month_start)`.
- [ ] Savings transactions are independent of budgets and trackers.
- [ ] Tracker transaction `(workspace_id, tracker_id)` consistency is enforced by composite FK.
- [ ] Ended trackers are read-only until reopened.
- [ ] Soft-deleted records have a consistent 30-day `purge_after`.
- [ ] Export and backup detail types match the common background job type; `background_jobs.status` is the sole lifecycle status.
- [ ] Idempotency records persist request fingerprint/replay metadata for at least 24 hours after terminal completion.
- [ ] Category scope membership and scope merges are transactional and collision-safe.
- [ ] Each annual export is generated for one recipient and written only to that recipient’s authorized Drive destination.
- [ ] Tombstones can represent account-only and workspace-only targets.
- [ ] Audit rows survive actor deletion where required, while target financial audit rows are purged with the target.

## Before any database exposure
- [ ] Enable RLS on every public application table.
- [ ] Create and review policies for every table and mutation path.
- [ ] Restrict direct writes where a transaction/function is required for cross-row invariants.
- [ ] Revoke unintended `anon`/`authenticated` privileges; grant least privilege.
- [ ] Verify all privileged functions use safe `search_path` and narrow `EXECUTE` grants.
- [ ] Test two-user isolation, removed-member access, owner transfer, and recovery.
- [ ] Test concurrent linked-refund requests.
- [ ] Test restore when the category was deleted.
- [ ] Test deletion/purge retries and backup reconciliation.


## Reconciliation checks added

- [ ] `workspace_category_scopes` maps personal workspaces to one owner scope and household workspaces to every active member scope.
- [ ] Household join/leave updates workspace-scope links and scope membership in one transaction; no category rows are merged.
- [ ] Category access is evaluated through authorized scope membership and household membership, not creator ID alone.
- [ ] Export/backup detail tables contain no independently writable lifecycle status/timestamps.
- [ ] Export recipient is explicit; each recipient's private Drive destination and authorization are rechecked.
- [ ] Queue/detail type cardinality is enforced, not merely assumed by application code.
- [ ] DDL and RLS grants/policies are statically reviewed together before any execution.

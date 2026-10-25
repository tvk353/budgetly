# Schema review checklist

Use this before approving or executing the migration package.

The checklist records verification still required; a listed design decision does not prove that the draft SQL enforces it. No migration is approved for execution by this checklist.

## Tables and core constraints

- [ ] Profiles use the Supabase Auth user UUID.
- [ ] Personal workspace cardinality and household owner invariants are correct.
- [ ] Household membership allows more than two active members, has exactly one active owner, and has no two-member cap, as specified by the approved ERD model.
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

## Label review checks

- [ ] `transactions.label_id` can be null for existing and new transactions.
- [ ] Composite FK prevents attaching a label from another workspace.
- [ ] Active label names are unique case-insensitively within a workspace.
- [ ] Deleting/archiving a label detaches it without deleting transactions.
- [ ] Label operations are covered by workspace-member RLS and server validation.
- [ ] Label changes do not affect budget eligibility, category totals, or refund calculations.

## Draft fixes requiring verification

- [ ] `003_integrity_functions.sql` now checks custom category scope linkage on ordinary/tracker transaction insert and workspace/category updates; test linked, unlinked, built-in, and deleted-scope cases under the final RLS policy.
- [ ] `003_integrity_functions.sql` now rejects budget inserts outside the current `Asia/Kolkata` month. Verify current-month insert, past-row update, future insert, and confirm API past-month writes use `UPDATE`, not an insert/upsert.
- [ ] `003_integrity_functions.sql` now checks job/detail types and cardinality at deferred transaction end, including parent job updates. Test valid atomic creation, missing detail, wrong child type, parent type/workspace changes, replacement, and cascades.
- [ ] Verify profile deletion/account purge cannot leave a Personal workspace without its required active owner; test deferred membership triggers with account lifecycle cleanup.
- [ ] Verify all `updated_at` columns have update triggers; `labels` was added to the trigger list and `deletion_tombstones` was already covered.
- [ ] `guard_trash_retention()` now requires exactly 30 days for ordinary Trash metadata. Test 29/30/31-day values, restore, and the separate account/workspace recovery window.
- [ ] Verify authenticated direct `DELETE` is denied and protected metadata updates are denied by Artifact 3 grants; trusted lifecycle operations must preserve parent/refund and savings/tracker history atomically.
- [ ] Verify future table/function default ACL revokes for every migration/object-creating role; the draft currently applies defaults only for the executing role.
- [ ] Require every new public-table migration to explicitly enable RLS and define policies; PostgreSQL does not automatically enable RLS on future tables.

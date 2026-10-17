# API and worker integration scenarios

These scenarios are acceptance requirements. Exact routes, RPC names, HTTP status codes, and response bodies must match the approved API contract artifact before implementation.

## Refund workflows

1. Create an expense of ₹1,000.00.
2. Create linked partial refunds of ₹250.00 and ₹300.00; remaining refundable amount is ₹450.00.
3. Attempt a further linked refund of ₹450.01; reject without persisting a partial result.
4. Submit two concurrent linked refund requests whose combined amount exceeds the remaining balance; total accepted refunds must not exceed the expense.
5. Attempt to link a refund to another workspace's expense; reject without revealing the foreign expense's details.
6. Delete a linked refund; the original expense remains unchanged and refundable capacity is restored.
7. Delete an expense; expense and linked refunds move to Trash atomically.
8. Restore a transaction after its category was permanently deleted; it is restored with no category and a correction flag.

## Budget workflows

1. Create a current-month budget with base ₹20,000 and rollover ₹500. Applicable budget is ₹20,500.
2. Add eligible expenses of ₹8,000 and eligible refunds of ₹1,000. Net eligible expenses are ₹7,000 and available budget is ₹13,500.
3. Increase expenses beyond ₹20,500; available budget becomes negative rather than clamped to zero.
4. Edit base budget mid-month; available amount recalculates immediately.
5. Attempt a duplicate budget for the same workspace/month; reject.
6. Attempt to create a budget for a past or future month; reject creation. Editing an existing past budget remains allowed.
7. Verify that tracker and savings transactions never change the monthly budget total.

## Deletion and recovery workflows

1. Soft-delete a transaction; verify normal lists and reports exclude it and Trash includes it.
2. Restore before `recover_until` / `purge_after`; verify it returns to normal views for currently authorized members.
3. Attempt restore after the deadline; reject.
4. Delete an expense with linked refunds; verify parent and linked refunds move to Trash together.
5. Delete a linked refund only; verify the expense remains active.
6. Run the same purge job twice; the second attempt is safe and records no duplicate destructive side effect.
7. Restore a workspace within 30 days; verify only currently authorized members regain access and revoked invitations remain revoked.
8. Permanently delete after the recovery window; verify the tombstone remains available for reconciliation.
9. Simulate restoring an older backup containing a purged workspace; the tombstone blocks resurrection.
10. Verify permanent deletion removes audit events associated with permanently deleted financial records, while shared history retains the approved "Deleted user" label when applicable.

## Export workflows

1. Request a CSV export for one workspace and date range; reject a request for a workspace the requester cannot access.
2. Verify export job records contain requester, workspace, date range, requested data types, and status; sensitive signed URLs are not returned in ordinary job-list responses.
3. Worker exports active records only; deleted rows are excluded. Hidden trackers are excluded from normal reports/exports according to product rules.
4. Remove requester from the household after export completion but before download; download must be denied after re-checking current membership.
5. Retry a failed job; ensure idempotency, consistent job/detail state, and no duplicate export artifacts.
6. Annual export covers the previous calendar year using `Asia/Kolkata`, stores output under the expected year folder, and emails only links accessible to each recipient.
7. Simulate one dataset failing during annual export; record the failure, retry according to policy, and notify on persistent failure.
8. Expired download links are rejected; access logs must not include bearer tokens or signed URL query strings.

## Authorization abuse cases

- Tamper with `workspace_id`, `created_by_user_id`, `user_id`, `role`, `is_builtin`, `deleted_by_user_id`, or `requested_by_user_id` in request bodies.
- Query resources by guessed UUIDs across workspaces.
- Reuse a revoked invitation link, expired invitation, or invitation for a different email identity.
- Attempt to update membership roles directly as an authenticated client.
- Attempt to read `background_jobs`, `backup_runs`, `deletion_tombstones`, or audit records without authorized access.
- Remove a member while they have an active session; subsequent requests must be denied without requiring the client to sign out.

## Reconciled decisions (12 October 2026)

- Category-scope isolation: user A and B who share a household-user category scope can see/manage its custom categories across their Personal and Shared Household workspaces; user C from an unrelated account cannot read or mutate those definitions. Built-ins remain globally visible.
- Category-scope merge: household join/scope membership change is atomic; normalized duplicate names are handled by a deterministic conflict response or reviewed merge workflow, never silent data loss.
- Annual Drive export: independently create recipient-specific jobs and destinations; each user only receives links for their authorized workspaces in their own Drive.
- Idempotency: verify replay semantics, different-payload conflict, and minimum 24-hour terminal retention.
- Pagination: transactions/history use cursor pagination; simple lists/reports use page-number pagination, with limit default 20/max 100 and endpoint-specific contract assertions.
- Background jobs: lifecycle transitions occur on `background_jobs`; detail rows store task parameters/results only.

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

## Reusable labels scenarios (planned; not executed)

1. Create `Amazon` in a workspace, then reuse it for transactions in Groceries and Shopping.
2. Create `Amazon` in another workspace; verify it is a separate label record.
3. Reject `amazon` as a duplicate active label in the same workspace.
4. Reject a transaction write that uses a label belonging to another workspace.
5. Delete a label and verify associated transactions remain and return `label_id: null`.
6. Filter transactions by label and verify budget totals remain unchanged.

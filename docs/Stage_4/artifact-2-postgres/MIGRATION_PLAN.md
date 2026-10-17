# Migration plan and review notes

## Proposed order

1. **001_tables.sql**
   - Create the application tables and declarative constraints.
   - Assumes Supabase's `auth` schema and `auth.users(id)` already exist.
   - Does not change or create Supabase Auth configuration.
2. **002_indexes.sql**
   - Add uniqueness and query-path indexes after the tables exist.
3. **003_integrity_functions.sql**
   - Add cross-row integrity functions and triggers.
   - These functions enforce data consistency only; they do not authorize users.
4. **Future Artifact 3 — RLS and security**
   - Enable RLS on all application tables.
   - Add per-table policies, private helper functions, grants/revokes, and RLS tests.
5. **Future Artifact 4 — API contracts and transaction procedures**
   - Finalize safe RPCs/service functions for creating linked refunds, workspace creation/owner transfer, soft-delete/restore cascades, and purge workflows.
6. **Future Artifact 5 — automated tests**
   - Exercise constraints, concurrent refunds, membership transitions, RLS, restore/purge, exports, and backup reconciliation.

## Key modeling decisions included

1. Custom categories use per-user scopes linked to workspaces through `workspace_category_scopes`. Personal workspaces link to their owner's scope; household workspaces link to each active member's scope. Unrelated Budgetly accounts cannot read/use them. Built-ins remain global.
2. A restored transaction may have `category_id IS NULL` only when `needs_category_correction = true`; assign a valid category to clear the flag. The same rule applies to tracker transactions.
3. Flexible household membership beyond two members, with exactly one active owner. Personal workspaces have exactly one active owner/member.
4. Tracker transactions store `workspace_id` and `tracker_id`; a composite foreign key prevents cross-workspace tracker references.
5. A shared `background_jobs` queue with `export_jobs` and `backup_runs` detail tables.
6. A durable `deletion_tombstones` ledger for account/workspace deletion and permanent-purge reconciliation.
7. Ordinary Trash is represented by per-record soft-delete columns, not a central Trash-item table.

## Reconciled decisions (12 October 2026)

- Annual Drive export: independently export each authorized workspace for each user to that user’s own Drive destination.
- Pagination: cursor for transaction/history and large changing collections; page-number for simple lists/reports; default 20, max 100.
- Job lifecycle status belongs only to `background_jobs`; detail tables hold parameters/results, not independent statuses.

## Explicitly not applied

No migration was run. No database was created, changed, or contacted.

## Review items before execution

- Confirm the exact built-in category seed list, including names, category types, icons, and colors.
- Custom category names are unique case-insensitively within category scope; built-in names are reserved globally. Category scope membership and workspace-scope links on household join/leave must be updated transactionally. Do not merge category rows; disambiguate same-named categories across scopes in the UI.
- Confirm whether category color/icon should be nullable or have product defaults.
- Confirm precise rules for transaction edit dates and tracker dates, including timezone handling at API boundaries. This draft validates future dates through write-time triggers in `Asia/Kolkata`.
- Confirm whether workspace `name` is required for personal workspaces or can be generated.
- Confirm account deletion semantics with Supabase Auth: disable sign-in during the 30-day recovery window, then delete the Auth user only after application data cleanup.
- Confirm the worker's claim/lease/retry protocol and how a backup checksum is calculated.
- Confirm the lifecycle rule for expired invitations. The unique active-invitation index requires expired outstanding invitations to be revoked/closed transactionally before a replacement invite is created.
- Decide which server-only functions are `SECURITY DEFINER`; if used, set a fixed safe `search_path`, revoke public execution, and grant only to the trusted server role.
- Confirm policy for hard deletion of a custom category referenced only by trashed rows. This schema permits the category to be deleted and sets those references to NULL via `ON DELETE SET NULL`; a trigger marks affected rows as needing category correction.
- Decide exact report eligibility for deleted/hidden/ended records. Aggregates should be calculated from active rows only, with hidden trackers excluded from normal reports.

## Design limitations / deliberate choices

- This draft uses checked `text` states rather than enums.
- Polymorphic audit targets and tombstone targets cannot have a conventional foreign key to all possible target tables. The target type is checked; service/database procedures must validate and process targets.
- `idempotency_records` stores durable request fingerprints and replay metadata. Retention is at least 24 hours after a terminal result; pending operations are not expired before reaching a terminal result. Cleanup is server-only.
- Supabase's `auth.users` schema is external to these migration files.
- RLS is intentionally omitted here to keep this artifact focused; **do not deploy client access until RLS is reviewed and enabled**.

## Reconciliation deployment path

1. Add `workspace_category_scopes` and indexes as additive changes.
2. Backfill each personal workspace to its owner's category scope; link household workspaces to all active members' scopes. Verify mappings before switching category queries.
3. Update trusted membership lifecycle functions and category-access helper functions in the same release window.
4. Remove duplicated status/timing fields from task detail tables only after application code reads lifecycle from `background_jobs`.
5. Apply constraints/functions, then RLS and grants, then switch server routes.
6. Validate in a disposable local Supabase environment after explicit approval; then staging. Verify a recoverable backup before destructive changes.
7. Rollback for destructive operations uses a verified recovery path; do not assume all DDL is automatically reversible.

This is a plan only; no migration was run.

## Reusable labels change

Add the `labels` table before transactions are used by the application, add nullable `transactions.label_id`, a same-workspace composite foreign key, and indexes for active-name uniqueness and label filtering. Existing transactions remain valid with `label_id = NULL`. This is a draft design change only; no migration was executed. If this schema has already been deployed, create a separately reviewed forward migration rather than editing an applied migration.

# Budgetly — Stage 4 Completion and Cross-Artifact Reconciliation

**Stage status:** COMPLETE — design and documentation baseline  
**Implementation status:** Not started; implementation-readiness checks remain gated  
**Date:** 12 October 2026  
**Scope:** Artifact 1 ERD; Artifact 2 PostgreSQL schema/migration design; Artifact 3 Supabase RLS/authorization; Artifact 4 test plan; Artifact 5 API contracts/OpenAPI draft.  
**Execution boundary:** No tests were executed, no migrations were applied, no database was connected to or changed, and Stage 6 has not started.

## 1. Completion decision

Stage 4 is complete as a **design stage**: the data model, authorization model, business invariants, endpoint catalogue, testing strategy, operational defaults, and migration approach are documented, and all product-owner decisions requested during reconciliation have been resolved. The design package is suitable to hand off to Stage 5 UI/UX, which can proceed without implementing or changing the database.

This does **not** mean the SQL has been proven executable or the application is ready for production. Before implementation or database rollout, the team must perform the explicitly gated static review, OpenAPI completion/validation, test-harness completion, disposable-environment tests, and migration review described in Section 7. These are verification gates, not unanswered product choices.

## 2. Product-owner decisions (resolved)

| Decision                                | Final choice                                           | Contract                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 — Custom category scope              | Option A: household-user scope, not app-wide           | Each user has a category scope; personal workspace links to its owner's scope; household workspace links to each active member's scope. Unrelated accounts cannot access it. Built-ins remain global.                                                                               |
| D2 — Annual Google Drive exports        | Option A: per-user Drive                               | Generate a separate export for each recipient and authorized workspace into that recipient's own private Drive destination. Recheck authorization at generation and delivery/download.                                                                                              |
| D3 — Idempotency retention              | At least 24 hours                                      | Scope by authenticated user + operation/route + workspace where applicable. Persist request fingerprint and replay result. Same request replays; different request with same key returns `409 IDEMPOTENCY_KEY_REUSED`. Pending operations do not expire before terminal completion. |
| D4 — Pagination                         | Mixed                                                  | Cursor pagination for transactions/history and other large, changing collections. Page-number pagination for simple lists and reports. Default 20, maximum 100. Each endpoint uses exactly one style.                                                                               |
| D5 — Category collisions and membership | No row merges                                          | Duplicate names in different user scopes remain separate; disambiguate in UI using category owner. Join/leave updates scope membership and workspace-scope links transactionally. Historical IDs are not rewritten.                                                                 |
| D6 — Privileged operations              | Next.js server handlers + narrow PostgreSQL functions  | No separate backend service or message broker. Service-role credentials stay server-side. Database functions are limited to operations needing atomicity or trusted lifecycle transitions.                                                                                          |
| D7 — Background processing              | One durable DB queue + one daily Vercel Cron route     | `background_jobs` is the sole lifecycle status source. Detail tables store only task-specific inputs/results. Process bounded batches, retry idempotently, and detect overdue jobs.                                                                                                 |
| D8 — Refund concurrency                 | Lock original expense                                  | Linked refund create/update locks the original expense row and validates the aggregate in the same transaction.                                                                                                                                                                     |
| D9 — Trash/deletion                     | Separate mechanisms for separate lifecycles            | Ordinary Trash uses per-record soft-delete fields; account/workspace lifecycle uses existing request tables plus `deletion_tombstones`. Purge is idempotent and tombstones prevent backup resurrection.                                                                             |
| D10 — Export security                   | Private, recipient-bound exports                       | No public Drive links. Download requires Budgetly authentication and current authorization. Drive credentials are stored encrypted server-side and never in logs/job rows. CSV export is not a full database backup.                                                                |
| D11 — Rate limits                       | Configurable app-level limits                          | OTP cooldown 60 seconds and max 3 verification attempts remain approved. Starting defaults: OTP sends 5/account/hour and 20/IP/hour; invitations 5/user/hour and 20/IP/hour; general writes 60/user/minute. Return `429` and `Retry-After`; keep limits configurable.               |
| D12 — API errors and contracts          | Stable error envelope                                  | `{ error: { code, message, request_id, details? } }`; no SQL text/secrets in responses. The human-readable API catalogue is authoritative for the full route set; the OpenAPI draft is a machine-readable subset pending expansion/validation before implementation.                |
| D13 — Migration approach                | Expand, verify, then switch                            | Additive migrations first; then constraints/indexes/functions; then RLS/grants; then application route switch. Use disposable local environment, staging verification, and verified recovery before destructive changes.                                                            |
| D14 — Testing                           | Complete plan now, execute only with separate approval | Test definitions and matrices are design artifacts. No tests are run in this completion pass. Before implementation readiness, replace harness placeholders and run tests only in a disposable local Supabase/PostgreSQL environment after explicit approval.                       |

### PRD reconciliation and API money conversion

- **Custom category scope:** D1 is the approved decision. The PRD now states that built-in categories are global and custom categories belong to per-user scopes linked to Personal and Shared Household workspaces. Custom names are unique within a scope; same-named rows from different scopes remain distinct.
- **Household membership:** The approved ERD model allows more than two active household members, with exactly one active owner and no two-member cap. The PRD and root README now use that model. The schema checklist still requires verification that the draft enforces it.
- **Money conversion:** API amounts are INR decimal strings; the UI boundary uses integer paise; PostgreSQL stores exact `numeric(14,2)`. Parse the decimal string as digits, pad the fractional part to two digits, and calculate `paise = whole_rupees * 100 + fractional_paise` without floating-point arithmetic. For example, `"123.4"` becomes `12340` paise and `"123"` becomes `12300` paise. Serialize integer paise as a decimal string with exactly two fractional digits, such as `12345` paise as `"123.45"`. Reject zero or invalid precision according to the existing positive-amount API rule.
- **PRD source:** The canonical PRD is present at `docs/PRD.md`. Earlier statements in this package that the source PRD was absent are incorrect and have been removed. The PRD already contains the workspace-scoped label requirements.

### Database design validation (25 October 2026)

Static review only; no database was connected, no tests were run, and no migration was applied. The draft SQL now removes authenticated hard-delete grants and limits editable columns; invitation reads exclude `token_hash`; category scope authorization uses linked workspace membership; and triggers guard current-month budget inserts, ordinary Trash retention, and both sides of job/detail consistency. These are **draft controls, not verified security properties**.

Remaining blockers include Auth-user fixture provisioning through a version-pinned local helper; trusted, atomic Trash/restore/purge procedures; verifying default ACLs for every object-creating role and explicitly enabling RLS on each future table; and API/schema gaps (`compatible_types` versus `category_type`, tracker `description`, unspecified confirmation/settings fields, base-budget zero semantics, and missing label-delete route contract). Deterministic public fixtures, cleanup, RLS inventory, future-object ACL/RLS probe, deferred parent-change scripts, and manual two-session refund/edit/Trash/restore sessions are now drafted. They have not run. Purge concurrency remains blocked because no trusted purge contract exists and direct delete can detach refunds. OpenAPI has 70 operations across 52 path templates, matching the catalogue by count; Prettier parsed the YAML, but semantic/schema validation remains unrun and `x-contract-gap` markers remain. Do not treat the SQL as approved migrations or claim security verification.

## 3. Canonical data and security rules

### 3.1 Workspace and access model

- Every financial record belongs to one workspace directly or through its parent record.
- The server authorizes every request against the current user, workspace, and lifecycle state; Supabase RLS independently enforces row-level access.
- Household members have equal ordinary financial permissions. Owner-only operations include member removal and ownership transfer. Membership/role/status changes are not directly writable by clients.
- Personal workspaces remain private to their owner. Household category scopes are linked explicitly; unrelated users cannot read custom categories.
- Operational tables (`background_jobs`, `export_jobs`, `backup_runs`, `idempotency_records`, `deletion_tombstones`, audit records, and lifecycle request records) are not directly writable by ordinary clients.

### 3.2 Categories

- Built-in categories are global catalog rows; visibility overrides are per household workspace and owner-controlled.
- Custom categories belong to per-user scopes. A personal workspace links to its owner's scope; a household workspace links to each active member's scope.
- Custom names are case-insensitively unique after trimming within a scope. Built-in names are reserved globally. Archived custom names remain reserved.
- Same-named categories from different scopes remain distinct; UI labels disambiguate by category owner. Never silently merge categories or rewrite historical transaction references.
- An active transaction must have a compatible category. The only null-category recovery state is `category_id IS NULL AND needs_category_correction = true` after a trashed record is restored following category purge. Category purge is blocked while active transactions reference the category; trashed references are nulled and flagged in the same delete transaction.

### 3.3 Transactions, refunds, budgets, savings, trackers

- Monetary persistence uses `numeric(14,2)`; JSON money values are decimal strings. Amounts are positive; dates use `Asia/Kolkata` and cannot be in the future locally.
- Linked refunds must point to an expense in the same workspace (and same tracker where applicable). The sum of active linked refunds cannot exceed the expense. Enforce through a transaction-safe function that locks the original expense row.
- Monthly budget: one row per workspace/month; create only for current calendar month; past budgets remain editable; rollover is non-negative; available budget may be negative. Calculated totals are derived, not duplicated stored totals.
- Savings are independent of monthly budgets and trackers. Soft-deleted savings transactions continue contributing to fund balance until permanent purge, as approved.
- Trackers are independent of monthly budget. Ended trackers are read-only until reopened; hidden trackers are excluded from normal views/reports; deleting/restoring a tracker and its transactions is atomic.

### 3.4 Trash, account/workspace deletion, and audit

- Ordinary Trash is per-record soft delete with `deleted_at`, `deleted_by_user_id`, and `purge_after`; normal retention is 30 days. Early permanent deletion requires explicit server-verified confirmation.
- Deleting an expense moves its linked refunds to Trash in the same transaction. Deleting a linked refund alone leaves the original expense unchanged and restores refundable capacity.
- Account/workspace deletion uses lifecycle request rows and durable tombstones, not the ordinary Trash mechanism. Recovery is available only within the approved 30-day window and does not reactivate revoked invitations.
- Purge is idempotent. Backup recovery must consult tombstones so purged accounts/workspaces are not resurrected. Financial audit records are deleted with permanently purged financial records; shared audit history uses the approved “Deleted user” label where appropriate.

### 3.5 Jobs, exports, idempotency, pagination

- `background_jobs` owns status, attempts, schedule, start/finish, lock, and safe error metadata. `export_jobs` and `backup_runs` hold task-specific fields only; they do not independently own lifecycle status.
- Each job has one compatible detail type. Job/detail creation is atomic and type-checked.
- User-initiated exports contain active records from one workspace per export. Annual Drive exports are per recipient, per authorized workspace, in the recipient's own private Drive folder. Recheck membership at request, generation, and download/link delivery.
- Idempotency keys are server-side and scoped by user + operation/route + workspace where applicable. Same fingerprint replays stored result; mismatched fingerprint returns conflict. Pending keys remain until terminal, then for at least 24 hours.
- Cursor pagination is used for transactions/history/high-churn collections; page-number pagination is used for categories, funds, trackers, workspace/member lists, and bounded reports. Default page size 20; maximum 100. Do not accept both cursor and page parameters on one endpoint.

## 4. Cross-artifact consistency map

| Concern                        | ERD                                    | PostgreSQL draft                                                         | RLS/security                                   | Test design                                               | API contract                                                   |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Category scopes and membership | Per-user scopes + workspace-scope link | `category_scopes`, `category_scope_members`, `workspace_category_scopes` | Scope helper; no app-wide custom-category read | Join/leave, unrelated-user denial, duplicate labels       | Category endpoints document owner-scope and collision behavior |
| Category purge/restore         | Nullable category correction state     | Delete trigger blocks active references; flags trashed references        | Purge via trusted operation only               | Active-reference rejection and trashed restore correction | Stable conflict/correction errors                              |
| Refund cap                     | Same-workspace linked expense          | Locking trigger/function design                                          | Server/RPC write boundary                      | Multi-session concurrency test planned                    | Idempotency and refund conflict contract                       |
| Job lifecycle                  | One queue + detail rows                | Queue status is authoritative                                            | No direct client writes                        | Job/detail mismatch and retry tests planned               | Status reads queue state                                       |
| Deletion/recovery              | Trash + tombstones                     | Soft-delete fields + lifecycle tables                                    | Trusted transactional lifecycle functions      | Idempotent purge and no-resurrection tests planned        | Recovery windows/errors documented                             |
| Exports                        | Per-user recipient                     | Recipient-bound export job                                               | Private storage; auth recheck                  | Removed-member download denial planned                    | Authenticated download endpoint                                |
| Idempotency                    | Idempotency record entity              | Unique scoped key + fingerprint/replay fields                            | Server-only                                    | Same-key replay and mismatch tests planned                | `Idempotency-Key`, 409 conflict                                |
| Pagination/errors              | API behavior                           | N/A                                                                      | Workspace checks before list                   | Boundary/invalid-combination tests planned                | Mixed style and stable error envelope                          |

## 5. Artifact inventory and status

1. **Artifact 1 — ERD:** design baseline complete; relationships and selected decisions documented.
2. **Artifact 2 — PostgreSQL schema/migration design:** DDL, indexes, constraints/functions, and staged migration plan drafted. SQL has not been executed.
3. **Artifact 3 — RLS/authorization:** policy/grant model and trusted operation boundaries documented. SQL has not been executed.
4. **Artifact 4 — Test coverage:** coverage matrix, test strategy, authorization/business-rule drafts, and integration scenarios documented. Tests have not been executed; fixture harness and final function bindings remain implementation preflight tasks.
5. **Artifact 5 — API contracts:** the human-readable catalogue has 70 method/path entries, and the OpenAPI draft now declares 70 operations across 52 path templates. Request/response details and several API/schema decisions remain marked as gaps; semantic/reference validation has not been run.

## 6. Stage 4 exit criteria

**Met for design-stage completion:**

- [x] Core data model and business rules documented.
- [x] Product decisions D1–D4 recorded.
- [x] Remaining defaults D5–D14 selected to favor low complexity and speed.
- [x] Category scope, job lifecycle, refund safety, deletion, export, idempotency, pagination, and error behavior have a canonical cross-artifact design.
- [x] Test strategy and security review requirements documented.
- [x] No implementation/database work was performed.

**Deferred to the implementation-readiness gate (backend implementation/rollout blockers, not blockers for beginning Stage 5 UI/UX):**

- [ ] Complete static schema review against the ERD, including table/column names, constraints, indexes, triggers/functions, ownership invariants, and migration ordering. SQL remains draft material and is not approved to apply.
- [ ] Reconcile every RLS policy with final schema objects; review per-table grants/revokes, default privileges, helper-function `search_path`, and narrow function execution grants together.
- [ ] Validate the trigger-backed linked-refund create/update contract: prove parent-row locking, aggregate checks, expense amount edits, and retries under multi-session concurrency. Add a trusted routine only if required by the finalized API/idempotency boundary.
- [ ] Resolve `x-contract-gap` API/schema items and validate every OpenAPI path, operation, reference, and schema against the catalogue and final SQL design.
- [ ] Complete deterministic pgTAP fixture setup/teardown, bind tests to final schema/functions, and remove placeholders. Include authenticated/anonymous-role tests and independent sessions for concurrency cases.
- [ ] After separate explicit approval, run tests only in a disposable local Supabase/PostgreSQL environment and record results.
- [ ] Review migration/rollback steps before any database execution.

## 7. Next-stage handoff

Stage 5 may now proceed with UI/UX design. Use these UX requirements from Stage 4:

- Category picker shows custom categories available through the selected workspace's linked scopes. Same-named categories from different owners remain distinct and show an owner label when necessary.
- A restored transaction with a deleted category prompts the user to choose a replacement before normal editing is complete.
- Transaction/history screens use cursor pagination; bounded category/fund/tracker/report lists use page-number pagination.
- Refund creation displays the remaining refundable amount, while the server remains authoritative under concurrent requests.
- Trash, restore, permanent deletion, ended/hidden trackers, and export status/error states need explicit UI states.
- Export/download actions must explain that files are private and access is checked at download time.

**No Stage 6 scaffold is authorized by this document.** Database execution, test execution, deployments, and credential integrations require separate explicit approval.

## Addendum — reusable transaction labels

**Product decision:** Labels are optional, reusable across all categories, and scoped to a workspace. Examples include `Amazon`, `D-Mart`, and `Local Store`. Labels do not replace categories and do not affect budget calculations.

Cross-artifact updates in this revision:

- ERD: add `labels` and optional transaction label relationship.
- PostgreSQL draft: add `public.labels`, nullable `transactions.label_id`, same-workspace composite FK, uniqueness and query indexes.
- RLS: scope label access to active workspace members.
- API/OpenAPI: add label list/create endpoints and optional `label_id` on transactions.
- Tests: add planned database, authorization, uniqueness, cross-workspace and behavior coverage.

This is a documentation/schema-draft update only. No migrations or tests were executed. The canonical PRD is present at `docs/PRD.md` and includes workspace-scoped reusable labels; the earlier statement that the PRD was not supplied was incorrect.

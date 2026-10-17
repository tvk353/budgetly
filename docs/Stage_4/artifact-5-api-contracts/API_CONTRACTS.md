# Budgetly API Contracts

## 1. Contract status and architecture

These contracts are a draft for the approved Budgetly design: Next.js + TypeScript modular monolith, Supabase Auth, PostgreSQL with RLS, online-only PWA, INR, and fixed timezone `Asia/Kolkata`.

All routes use `/api/v1`. JSON request and response bodies use UTF-8. The server derives the user from the validated Supabase session. Client-provided user IDs are never trusted for authorization. Workspace IDs are selectors, not proof of access.

## 2. Common conventions

### 2.1 Success response

Single-resource operations return the resource directly, unless the endpoint specifies a wrapper. Collections use a `data` array plus an endpoint-specific `page` object. The endpoint catalogue explicitly declares one pagination style per endpoint:

Cursor style (transactions/history and large changing collections):

```json
{ "data": [], "page": { "style": "cursor", "limit": 20, "next_cursor": null, "has_more": false } }
```

Page-number style (simple lists and reports):

```json
{
  "data": [],
  "page": {
    "style": "page_number",
    "limit": 20,
    "page_number": 1,
    "total_count": 0,
    "total_pages": 0
  }
}
```

Mutation responses include the persisted representation where useful. `204 No Content` is used for successful operations with no response body.

### 2.2 Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      {
        "field": "amount",
        "code": "DECIMAL_FORMAT",
        "message": "Use a positive amount with at most two decimal places."
      }
    ],
    "request_id": "req_..."
  }
}
```

`details` is optional. Error messages must not include secrets, SQL details, stack traces, OTPs, signed URLs, or existence details for resources the caller cannot access.

### 2.3 HTTP status conventions

| Status | Use                                                                               |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | Successful read or mutation with response body                                    |
| `201`  | Resource created                                                                  |
| `202`  | Asynchronous job accepted                                                         |
| `204`  | Successful operation with no body                                                 |
| `400`  | Malformed request, invalid query parameter, or invalid state transition           |
| `401`  | Missing/invalid authentication                                                    |
| `403`  | Authenticated but explicitly forbidden where existence disclosure is safe         |
| `404`  | Missing resource or resource intentionally concealed due to lack of access        |
| `409`  | Conflict, duplicate, stale state, idempotency conflict, or business-rule conflict |
| `410`  | Invitation or recovery window expired, when disclosure is safe                    |
| `413`  | Request body too large                                                            |
| `415`  | Unsupported content type                                                          |
| `422`  | Well-formed request that violates domain validation                               |
| `429`  | Rate limit exceeded; include `Retry-After` when available                         |
| `500`  | Unexpected server error; generic message only                                     |
| `503`  | Temporarily unavailable dependency or maintenance; safe retry guidance            |

### 2.4 Pagination and filtering

- Default `limit=20`; maximum `limit=100`.
- Use cursor pagination for transaction/history lists and other large, frequently changing collections. Cursor is opaque and bound to filter/sort context.
- Use page-number pagination for simple lists and reports where numbered pages and totals are useful.
- Each endpoint uses exactly one style; cursor and page-number parameters cannot be combined.
- Default `limit=20`; maximum `limit=100` for both styles. Invalid cursor, filter-mismatched cursor, invalid page number, or invalid limit returns `400`.
- Date ranges are inclusive in the `Asia/Kolkata` calendar. API timestamps are RFC 3339 UTC instants; date-only values use `YYYY-MM-DD`.
- Sort order must be explicitly allow-listed; arbitrary column names are rejected.
- Collection endpoints return only active, non-trashed records unless the endpoint explicitly serves Trash or history.

### 2.4.1 Pagination assignment by endpoint family

- **Cursor:** workspace transactions; savings-fund transactions; tracker transactions; audit/history feeds; Trash/history collections when they can grow or change frequently.
- **Page number:** category lists within a workspace scope; workspace/fund/tracker lists; export-job lists; simple lookup lists; collection-shaped reports where numbered pages/totals are useful.
- Endpoints that return a single summary object do not need pagination. The OpenAPI operation must use the matching `CursorPage` or `PageNumberPage` schema for collection responses. Do not expose both cursor and page-number query parameters on one operation.

### 2.5 Amounts, dates, and text

- Monetary amounts are positive decimal strings with at most two fractional digits: `^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,2})?$`; domain endpoints additionally reject zero.
- No floating-point arithmetic for money. PostgreSQL uses exact numeric types.
- Currency is `INR` for the initial release and is not client-selectable.
- Transaction date must be today or earlier in `Asia/Kolkata`.
- Description: optional, max 50 characters. Notes: optional, max 500 characters.
- Category is required for a new ordinary transaction and tracker transaction unless the record is a restored record flagged `needs_category_correction=true`.
- Unknown fields are rejected on mutation requests (`400`); strings are trimmed where specified.

### 2.6 Idempotency and concurrency

- Clients may send `Idempotency-Key` (8–128 visible ASCII characters) for create/export/financial mutation requests. Persist the key, request fingerprint, state, and replayable result metadata server-side. Scope keys by authenticated user + route/operation + workspace where applicable. Retain terminal results for at least 24 hours; pending operations must not expire before a terminal result and remain replayable for at least 24 hours afterward. Same key + same fingerprint replays the original result; same key + different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`.
- For conditional mutations, clients may send `If-Match` with the resource version/ETag. A stale version returns `409 VERSION_CONFLICT`.
- Linked refunds must be created in a transaction that locks/serializes against the original expense and checks the remaining refundable amount. Application-only checks are insufficient.
- Responses must not claim a mutation succeeded until the transaction commits.

## 3. Authentication and account

| Method & path                     | Purpose                                                     | Success | Expected errors            |
| --------------------------------- | ----------------------------------------------------------- | ------: | -------------------------- |
| `POST /auth/otp/request`          | Send sign-in OTP                                            |   `202` | `400`, `429`, `503`        |
| `POST /auth/otp/verify`           | Verify single-use OTP and establish session                 |   `200` | `400`, `401`, `410`, `429` |
| `POST /auth/logout`               | Revoke current session                                      |   `204` | `401`                      |
| `POST /auth/logout-all`           | Revoke all sessions, with explicit current-session behavior |   `204` | `401`, `403`               |
| `GET /me`                         | Current profile and session context                         |   `200` | `401`                      |
| `PATCH /me`                       | Update allowed profile fields only                          |   `200` | `400`, `401`, `422`        |
| `POST /account/deletion-requests` | Request account deletion; disable sign-in per approved flow |   `202` | `401`, `409`, `422`        |
| `POST /account/recovery`          | Start account recovery within 30 days                       |   `202` | `401`, `404`, `410`, `429` |

### OTP request

Request:

```json
{ "email": "user@example.com" }
```

Rules: normalize email consistently; do not disclose whether an account exists; enforce five-minute expiry, single use, maximum three verification attempts, 60-second resend cooldown, and per-account/IP rate limits. Return a generic accepted response.

### OTP verification

Request:

```json
{ "email": "user@example.com", "otp": "123456" }
```

Rules: OTP must be single-use and unexpired. Invalid, expired, or exhausted attempts return a generic authentication error. Provider session cookies/tokens must use secure settings appropriate to deployment.

### Profile patch

Allowed request:

```json
{ "display_name": "Vinod" }
```

Only `display_name` is client-editable through this endpoint. Unknown or protected fields (role, email verification, account status) are rejected.

## 4. Workspace and membership

| Method & path                                                 | Purpose                                                                 | Success | Expected errors                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------: | --------------------------------- |
| `GET /workspaces`                                             | List workspaces current user can access                                 |   `200` | `401`                             |
| `POST /workspaces`                                            | Create personal or household workspace through trusted server operation |   `201` | `401`, `409`, `422`               |
| `GET /workspaces/{workspaceId}`                               | Workspace details                                                       |   `200` | `401`, `404`                      |
| `PATCH /workspaces/{workspaceId}`                             | Update permitted workspace metadata                                     |   `200` | `401`, `404`, `422`               |
| `GET /workspaces/{workspaceId}/members`                       | List active members                                                     |   `200` | `401`, `404`                      |
| `POST /workspaces/{workspaceId}/invitations`                  | Create invite; household only                                           |   `201` | `401`, `404`, `409`, `422`, `429` |
| `GET /workspaces/{workspaceId}/invitations`                   | List current invitations                                                |   `200` | `401`, `404`                      |
| `DELETE /workspaces/{workspaceId}/invitations/{invitationId}` | Revoke invite                                                           |   `204` | `401`, `404`                      |
| `POST /invitations/{token}/join`                              | Join after identity/email verification                                  |   `200` | `401`, `404`, `409`, `410`        |
| `DELETE /workspaces/{workspaceId}/members/{userId}`           | Remove member; owner-only and guarded                                   |   `204` | `401`, `404`, `409`, `422`        |
| `POST /workspaces/{workspaceId}/ownership-transfer`           | Transfer ownership with re-authentication                               |   `200` | `401`, `404`, `409`, `422`        |
| `POST /workspaces/{workspaceId}/deletion-requests`            | Start 30-day workspace recovery window                                  |   `202` | `401`, `404`, `409`, `422`        |
| `POST /workspaces/{workspaceId}/recovery`                     | Recover within 30 days if currently authorized                          |   `200` | `401`, `404`, `410`, `409`        |

Workspace create request:

```json
{ "kind": "personal", "name": "Personal" }
```

`kind` is `personal` or `household`. Personal creation must enforce one active member/owner. Household workspaces allow more than two active members but exactly one owner. A user's default workspace selection is application preference, not authorization.

Invitation create request:

```json
{ "email": "partner@example.com", "delivery_method": "email" }
```

Invitation expires after seven days, is revocable, and is bound to a household workspace. A shareable link is a secret bearer token; store only a hash, redact from logs, and never place it in analytics. Joining requires verified identity and matching invitation constraints. Revoke all invitations when workspace deletion begins; recovery must not reactivate them.

Ownership transfer request:

```json
{ "new_owner_user_id": "uuid", "reauth_proof": "provider-bound-proof" }
```

The `reauth_proof` must be verified server-side and never logged. New owner must be an active member. The transfer must commit atomically and preserve exactly one owner.

## 5. Categories

| Method & path                                                                | Purpose                                                                                                  | Success | Expected errors            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------: | -------------------------- |
| `GET /workspaces/{workspaceId}/categories`                                   | List built-ins and custom categories from scopes linked to the workspace, filterable by transaction type |   `200` | `401`, `404`, `400`        |
| `POST /workspaces/{workspaceId}/categories`                                  | Create custom category in the workspace’s category scope                                                 |   `201` | `401`, `404`, `409`, `422` |
| `PATCH /workspaces/{workspaceId}/categories/{categoryId}`                    | Rename/update a custom category in the workspace’s category scope                                        |   `200` | `401`, `404`, `409`, `422` |
| `POST /workspaces/{workspaceId}/categories/{categoryId}/archive`             | Archive custom category                                                                                  |   `200` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/categories/{categoryId}/restore`             | Restore archived custom category                                                                         |   `200` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/built-in-categories/{categoryId}/visibility` | Owner-controlled workspace visibility setting                                                            |   `200` | `401`, `404`, `403`, `422` |
| `DELETE /workspaces/{workspaceId}/categories/{categoryId}`                   | Permanently delete if allowed by reference rules                                                         |   `204` | `401`, `404`, `409`        |

Create request:

```json
{
  "name": "Baby Expenses",
  "description": "Expenses related to the baby",
  "color": "#176B57",
  "icon": "baby",
  "compatible_types": ["expense"]
}
```

Name is trimmed, 1–30 non-space characters, unique case-insensitively within the household-user category scope (including archived names). Description max 200 characters. Color must be an allow-listed hex color; icon must be an allow-listed icon identifier. Built-in category names cannot be renamed or deleted. Custom categories use per-user scopes and a many-to-many `workspace_category_scopes` mapping: a personal workspace links to its owner's scope, and a household workspace links to each active member's scope. Category-scope membership controls access. Unrelated Budgetly accounts cannot read or use these categories. Built-in categories remain global. Visibility of built-in categories is workspace-specific. Archived categories remain in historical records and cannot be selected for new transactions. Category type compatibility must be enforced server-side and in database constraints.

## 6. Transactions and refunds

| Method & path                                                                  | Purpose                                                  | Success | Expected errors                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- | ------: | --------------------------------- |
| `GET /workspaces/{workspaceId}/transactions`                                   | List active transactions (cursor pagination)             |   `200` | `401`, `404`, `400`               |
| `POST /workspaces/{workspaceId}/transactions`                                  | Create expense or refund                                 |   `201` | `401`, `404`, `409`, `422`, `429` |
| `GET /workspaces/{workspaceId}/transactions/{transactionId}`                   | Read transaction                                         |   `200` | `401`, `404`                      |
| `PATCH /workspaces/{workspaceId}/transactions/{transactionId}`                 | Update allowed fields                                    |   `200` | `401`, `404`, `409`, `422`        |
| `DELETE /workspaces/{workspaceId}/transactions/{transactionId}`                | Move to Trash; linked refund cascade rule applies        |   `204` | `401`, `404`, `409`               |
| `POST /workspaces/{workspaceId}/transactions/{transactionId}/restore`          | Restore transaction and eligible linked refunds          |   `200` | `401`, `404`, `409`, `422`        |
| `POST /workspaces/{workspaceId}/transactions/{transactionId}/permanent-delete` | Permanently delete trashed transaction with confirmation |   `204` | `401`, `404`, `409`, `422`        |

Expense create:

```json
{
  "type": "expense",
  "amount": "125.50",
  "date": "2026-10-12",
  "category_id": "uuid",
  "description": "Groceries",
  "notes": "Weekly shop"
}
```

Refund create:

```json
{
  "type": "refund",
  "amount": "25.00",
  "date": "2026-10-12",
  "category_id": "uuid",
  "linked_expense_id": "uuid",
  "description": "Partial refund"
}
```

Amounts must be greater than zero. For a linked refund, expense must be active, in the same workspace, and eligible; aggregate active linked refunds plus the new refund may not exceed the original expense amount. The category inherits from the expense at refund creation, but thereafter is independent. Unlinked refunds are allowed and still reduce net eligible expenses according to category/report rules. Refund and expense dates must not be future dates in IST. Duplicate detection is a warning, not a rejection.

Update request may modify amount, date, category, description, and notes subject to rules; it cannot change workspace, creator, or record type without a dedicated transition contract. Trashed records cannot be edited; restore first. Restoring a transaction whose category was permanently deleted allows `category_id: null` only with `needs_category_correction: true`; replacement category assignment clears the flag.

### Transaction response

```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "type": "expense",
  "amount": "125.50",
  "currency": "INR",
  "date": "2026-10-12",
  "category_id": "uuid",
  "needs_category_correction": false,
  "description": "Groceries",
  "notes": "Weekly shop",
  "created_at": "2026-10-12T12:30:00Z",
  "updated_at": "2026-10-12T12:30:00Z",
  "version": 1
}
```

## 7. Monthly budgets

| Method & path                                                | Purpose                                 | Success | Expected errors            |
| ------------------------------------------------------------ | --------------------------------------- | ------: | -------------------------- |
| `GET /workspaces/{workspaceId}/budgets/{yyyy-mm}`            | Get month budget and calculated summary |   `200` | `401`, `404`, `400`        |
| `PUT /workspaces/{workspaceId}/budgets/{yyyy-mm}`            | Create/update that month budget         |   `200` | `401`, `404`, `409`, `422` |
| `PATCH /workspaces/{workspaceId}/budgets/{yyyy-mm}/rollover` | Set manual non-negative rollover        |   `200` | `401`, `404`, `409`, `422` |

Budget request:

```json
{ "base_budget": "50000.00", "rollover": "1500.00" }
```

New budget creation is permitted only for the current calendar month in `Asia/Kolkata`. Past budgets can be edited; future budgets cannot be created unless product requirements change. At most one budget per workspace/month. Base budget must be positive; rollover must be zero or positive. Mid-month changes recalculate immediately.

Response includes `base_budget`, `rollover`, `applicable_budget`, `eligible_expenses`, `eligible_refunds`, `net_eligible_expenses`, `available`, and `month`. `available` may be negative. Calculations must use exact numeric arithmetic and the same eligibility rules across dashboard, reports, and exports.

## 8. Savings

| Method & path                                                           | Purpose                         | Success | Expected errors            |
| ----------------------------------------------------------------------- | ------------------------------- | ------: | -------------------------- |
| `GET /workspaces/{workspaceId}/savings-funds`                           | List funds and balances         |   `200` | `401`, `404`               |
| `POST /workspaces/{workspaceId}/savings-funds`                          | Create fund                     |   `201` | `401`, `404`, `409`, `422` |
| `PATCH /workspaces/{workspaceId}/savings-funds/{fundId}`                | Rename/update allowed fields    |   `200` | `401`, `404`, `409`, `422` |
| `DELETE /workspaces/{workspaceId}/savings-funds/{fundId}`               | Soft-delete fund                |   `204` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/savings-funds/{fundId}/restore`         | Restore fund                    |   `200` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/savings-funds/{fundId}/transactions`    | Deposit or withdrawal           |   `201` | `401`, `404`, `422`        |
| `DELETE /workspaces/{workspaceId}/savings-transactions/{transactionId}` | Soft-delete savings transaction |   `204` | `401`, `404`, `409`        |

Fund name is trimmed, 1–50 characters, unique case-insensitively within the workspace. Deposit/withdrawal amount is positive. Balance is deposits minus withdrawals; negative balance is allowed. Savings are independent of monthly budget and trackers. A soft-deleted fund's retained transactions still contribute to its balance until permanent deletion, but it is excluded from normal screens. Restore brings retained transactions back into normal views.

## 9. Trackers

| Method & path                                                      | Purpose                                    | Success | Expected errors            |
| ------------------------------------------------------------------ | ------------------------------------------ | ------: | -------------------------- |
| `GET /workspaces/{workspaceId}/trackers`                           | List active, non-hidden trackers           |   `200` | `401`, `404`               |
| `POST /workspaces/{workspaceId}/trackers`                          | Create tracker                             |   `201` | `401`, `404`, `409`, `422` |
| `GET /workspaces/{workspaceId}/trackers/{trackerId}`               | Read tracker and totals                    |   `200` | `401`, `404`               |
| `PATCH /workspaces/{workspaceId}/trackers/{trackerId}`             | Rename, hide/show, or reopen ended tracker |   `200` | `401`, `404`, `409`, `422` |
| `POST /workspaces/{workspaceId}/trackers/{trackerId}/end`          | End tracker (read-only)                    |   `200` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/trackers/{trackerId}/transactions` | Create tracker expense/refund              |   `201` | `401`, `404`, `409`, `422` |
| `DELETE /workspaces/{workspaceId}/trackers/{trackerId}`            | Trash tracker and its records together     |   `204` | `401`, `404`, `409`        |
| `POST /workspaces/{workspaceId}/trackers/{trackerId}/restore`      | Restore tracker and eligible records       |   `200` | `401`, `404`, `409`, `422` |

Tracker create request:

```json
{ "name": "Maternity Expenses", "description": "Pregnancy-related spending" }
```

Trackers have no required start/end dates. Ending makes a tracker read-only until reopened. Hidden trackers are excluded from normal screens and reports; explicit hidden-tracker views may include them. Tracker transactions store `workspace_id` and `tracker_id`; both must match. Tracker category compatibility is enforced. Tracker records do not affect monthly budget totals.

## 10. Trash and audit history

| Method & path                                                                   | Purpose                              | Success | Expected errors            |
| ------------------------------------------------------------------------------- | ------------------------------------ | ------: | -------------------------- |
| `GET /workspaces/{workspaceId}/trash`                                           | Combined paginated Trash view        |   `200` | `401`, `404`, `400`        |
| `POST /workspaces/{workspaceId}/trash/{recordType}/{recordId}/restore`          | Restore supported record type        |   `200` | `401`, `404`, `409`, `422` |
| `POST /workspaces/{workspaceId}/trash/{recordType}/{recordId}/permanent-delete` | Permanently delete with confirmation |   `204` | `401`, `404`, `409`, `422` |
| `GET /workspaces/{workspaceId}/audit-events`                                    | Read permitted audit history         |   `200` | `401`, `404`, `400`        |

Trash response items have `record_type`, `record_id`, `workspace_id`, `deleted_at`, `purge_after`, and a safe display summary. `recordType` is an enum, not an arbitrary table name. Restore is allowed only during the 30-day window unless the record has a different explicitly approved lifecycle. Permanent deletion requires an explicit confirmation field/token and removes audit entries associated with the permanently deleted financial record per the approved retention rule. Audit events are not client-editable. Retention is one year except associated financial audit entries deleted with the permanent purge.

## 11. Reports and exports

| Method & path                                                | Purpose                                                                 | Success | Expected errors                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ------: | --------------------------------- |
| `GET /workspaces/{workspaceId}/reports/summary`              | Summary for date range (page-number pagination where collection-shaped) |   `200` | `401`, `404`, `400`               |
| `GET /workspaces/{workspaceId}/reports/categories`           | Category breakdown                                                      |   `200` | `401`, `404`, `400`               |
| `POST /workspaces/{workspaceId}/exports`                     | Create user-requested export job                                        |   `202` | `401`, `404`, `409`, `422`, `429` |
| `GET /workspaces/{workspaceId}/exports`                      | List export jobs current user may see                                   |   `200` | `401`, `404`                      |
| `GET /workspaces/{workspaceId}/exports/{exportId}`           | Export job status                                                       |   `200` | `401`, `404`                      |
| `POST /workspaces/{workspaceId}/exports/{exportId}/download` | Authorize and issue short-lived download URL                            |   `200` | `401`, `404`, `409`, `410`        |

Export request:

```json
{
  "data_types": ["transactions", "budgets", "savings", "trackers"],
  "period": { "start_date": "2026-01-01", "end_date": "2026-10-12" },
  "format": "csv"
}
```

One workspace per export job. Dates are inclusive in IST and `start_date <= end_date`. Export only active records; each data type is a separate CSV file. Filenames include workspace, data type, and export date. Only an authenticated currently authorized user can initiate/download. Do not expose permanent public URLs. Signed download URLs must be short-lived and issued after re-checking current membership and job ownership/access. Export job status: `pending`, `running`, `completed`, `failed`; retries are idempotent. Job errors are sanitized.

Annual export: scheduled for each January for the previous calendar year, all approved data types/history. Generate a separate recipient-specific export for each user and each workspace they are currently authorized to access, and store it in that user’s own authorized Google Drive year folder. Shared Household data may be duplicated for both members. Never share Drive credentials, destination tokens, or private links across users. Recheck recipient authorization at scheduling, generation, and delivery. Email only links to exports the recipient is authorized to access. Annual files are retained until the user deletes them. The daily-capable hosting scheduler is not an exact-time guarantee; missed runs must be detected and retried.

## 12. Settings and account management

| Method & path                                        | Purpose                                                   | Success | Expected errors            |
| ---------------------------------------------------- | --------------------------------------------------------- | ------: | -------------------------- |
| `GET /settings`                                      | Read user preferences                                     |   `200` | `401`                      |
| `PATCH /settings`                                    | Update permitted preferences, including default workspace |   `200` | `401`, `422`               |
| `POST /account/sessions/revoke`                      | Revoke selected session(s)                                |   `204` | `401`, `422`               |
| `GET /account/deletion-requests/{requestId}`         | Check deletion/recovery state                             |   `200` | `401`, `404`               |
| `POST /account/deletion-requests/{requestId}/cancel` | Cancel pending deletion inside permitted window           |   `200` | `401`, `404`, `409`, `410` |

Default workspace is a preference and cannot grant access to a workspace. Sign-out-all must immediately revoke sessions. Recovery requires email verification and must restore access only subject to current authorization rules.

## 13. Cross-cutting security requirements

- Use secure, HttpOnly, SameSite cookies as appropriate; protect state-changing routes against CSRF if cookie auth is used.
- Validate content type, body size, path IDs, UUID format, query parameters, enums, and unknown fields.
- Rate-limit OTP, invitation, export, and write endpoints by appropriate identity/IP dimensions.
- Do not use the Supabase service-role key in client bundles. Server-only privileged code must narrowly scope operations and explicitly validate authorization.
- RLS remains mandatory even when the API performs authorization checks.
- Use least-privilege table grants. Do not expose operational tables or tombstones to normal clients.
- Log request IDs and security-relevant outcomes without OTPs, invite tokens, re-auth proofs, signed URLs, notes, or unnecessary financial detail.
- Use a transactional outbox or equivalent for critical post-commit work (emails, job enqueueing, export notifications) to avoid state/message divergence.

## 14. Reconciled decisions and remaining implementation gates

Resolved by product owner on 12 October 2026:

1. **Category scope:** Option A, household-user scope. Custom categories are shared across the relevant users’ Personal and Shared Household workspaces, not app-wide. Built-ins remain globally readable; custom category uniqueness is within scope, case-insensitively after trimming.
2. **Annual Drive export:** Option A, recipient-specific exports to each user's own authorized Drive destination. Shared Household data may be exported separately for each member.
3. **Idempotency:** persist request fingerprint and replay metadata; terminal results retained for at least 24 hours; pending jobs do not expire before terminal completion.
4. **Pagination:** mixed style—cursor for transactions/history and large changing collections; page-number for simple lists/reports. Default limit 20, maximum 100.

Remaining gates before implementation:

- Verify category-scope relational model and transactional scope-link changes on household membership changes; no category-row merges occur.
- Reconcile the final SQL/RLS/API semantics for category deletion when only trashed records reference a category.
- Specify server-side profile/session revocation and Supabase Auth limitations.
- Define exact API rate-limit thresholds in deployment configuration.
- Validate the full OpenAPI document and every schema against the final SQL schema and endpoint catalogue.
- Ensure `background_jobs.status` is the sole lifecycle source of truth; detail tables cannot independently mutate status.
- Implement and test idempotency cleanup/replay behavior, recipient-specific Drive export workflow, and per-endpoint pagination declarations.

This remains a contract draft. No OpenAPI validation or tests have been run as part of this update.

## Reconciliation defaults for implementation

- **Category scope:** per-user category scopes with a many-to-many `workspace_category_scopes` mapping. Personal workspaces link to their owner's scope; household workspaces link to every active member's scope. Membership changes are server-side and transactional. No automatic category merges; same-named categories from different scopes remain distinct and the UI disambiguates by owner.
- **Job status:** read lifecycle status, attempt count, scheduled/start/finish times, and errors from `background_jobs`; task detail endpoints return task-specific parameters/results without independent status fields.
- **Idempotency:** scope by authenticated user + route/operation + workspace where applicable. Same key and same request replays the stored result. Same key with a different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`. Keep pending records until terminal and retain terminal results for at least 24 hours.
- **Pagination:** cursor for transaction/history lists; page-number for categories, funds, trackers, workspace/member lists, and bounded reports. Default 20/max 100. Each endpoint documents one style and rejects parameters from the other style.
- **Errors:** use the existing `{ error: { code, message, request_id, details? } }` envelope; use `details` for field-level validation and never return SQL text or secrets.
- **Scheduler:** one protected daily Vercel Cron route processes bounded batches from `background_jobs`; overdue work remains queued for retry. No separate worker or broker.
- **Rate limits:** OTP send 5/account/hour and 20/IP/hour in addition to the approved 60-second cooldown and 3 verification attempts; invitations 5/user/hour and 20/IP/hour; general writes 60/user/minute. Return `429` and `Retry-After`; keep thresholds configurable.
- **Export security:** each annual export is recipient-bound and private in the recipient's Drive. Download requires Budgetly authentication and a current authorization check.
- **Implementation status:** OpenAPI remains a draft until completed against the full route catalogue and validated. These design updates do not claim a validator or tests were run.

## Reusable labels

- `GET /workspaces/{workspaceId}/labels`: list active labels in the authorized workspace.
- `POST /workspaces/{workspaceId}/labels`: create a reusable label with `{ "name": "Amazon" }`.
- Label names are trimmed, 1–50 characters, and unique case-insensitively among active labels in a workspace. Return `409` for an active duplicate.
- Transaction create/update accepts optional `label_id` (UUID or null). A label must belong to the same workspace as the transaction.
- Transaction responses include nullable `label_id`. Clients may resolve the display name from the workspace labels list.
- Labels can be used with any category. Label filtering must not change budget calculations or category totals.
- Label deletion is a soft-delete operation and detaches the label from transactions; it never deletes transactions.

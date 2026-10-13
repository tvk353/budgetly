# Coverage matrix summary

The companion CSV is the source of truth for case IDs and status. The suite is intentionally marked **Planned** or **Draft**, never Passed, because no tests have been executed.

## P0 — Release blockers

| Area                  | Required coverage                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS                   | Unrelated workspace cannot read, insert, update, or delete records; removed member loses access; user cannot self-promote or modify membership directly |
| Refunds               | Cross-workspace link rejected; refund cannot exceed expense; concurrent partial refunds remain capped; refund totals affect budget correctly            |
| Budget                | Duplicate workspace/month budget rejected; negative base/rollover rejected; future month creation blocked by service/database boundary                  |
| Deletion              | Restore/purge deadlines enforced; parent/child Trash behavior atomic; purge retry is idempotent; tombstones prevent resurrection                        |
| Exports               | Cross-workspace export request denied; unauthorized/removed member cannot download; output contains only eligible active rows                           |
| Privileged operations | Authenticated role cannot read/write background jobs, backup runs, tombstones, or forge audit events                                                    |

## P1 — Required before private beta

- Global category naming/archiving and missing-category correction.
- Budget formulas, rollover, negative available budget, and mid-month budget edits.
- Savings fund balance and soft-delete semantics.
- Tracker ended/hidden behavior and workspace-consistent tracker transactions.
- Export retry, annual range, job state consistency, and failure handling.
- Account/workspace recovery within 30 days and denial after expiry.
- Invitation expiry/revocation and no reactivation after restore.

## Test status

- Planned: coverage matrix and scenarios.
- Draft: pgTAP test outline.
- Not run: all SQL and integration tests.
- Blocked pending finalization: exact RPCs, worker contract, schema/policy reconciliation, fixture harness, local test environment.

## Reconciliation additions (not executed)

- CAT-SCOPE-01: scope members can read/manage custom categories across their Personal and Shared Household workspaces.
- CAT-SCOPE-02: unrelated users cannot read or mutate custom categories.
- CAT-SCOPE-03: scope membership changes and duplicate-name collisions on household join are atomic.
- EXP-DRIVE-01: annual exports are independently authorized and written to each recipient’s own Drive destination.
- IDEM-01: same key and fingerprint replays; changed fingerprint conflicts; terminal result retained at least 24 hours.
- PAGE-01: cursor-based transaction/history lists and page-number simple lists/reports obey default 20/max 100 and reject mixed pagination parameters.
- JOB-STATUS-01: lifecycle state is stored only on `background_jobs`; details do not expose independent writable status.

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

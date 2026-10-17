# API Contract Review Checklist

Do not treat this artifact as approved until each item is reviewed.

## Contract consistency

- [ ] All routes use `/api/v1`; path names and resource IDs match the schema.
- [ ] Every mutation specifies authentication, authorization, validation, success status, and failure status.
- [ ] Amounts are represented as decimal strings; calculations use exact numeric types.
- [ ] Date-only fields are interpreted in `Asia/Kolkata`; timestamps are RFC 3339 instants.
- [ ] Unknown fields and client-supplied protected fields are rejected.
- [ ] List routes enforce limit 20 by default, max 100, and stable cursor semantics.

## Authorization

- [ ] Every workspace route checks current active membership and workspace lifecycle state.
- [ ] RLS remains enabled; service-role usage is restricted to server-only code.
- [ ] Global categories are not mistaken for workspace-owned data.
- [ ] Export download rechecks identity and current access.
- [ ] Invitations are hashed, expiry-bound, revocable, and never reactivated after workspace recovery.
- [ ] Account/workspace recovery respects the 30-day window and tombstones.

## Financial invariants

- [ ] Linked refunds are serialized/locked and cannot exceed original expense total.
- [ ] Expense deletion/restoration handles linked refunds according to approved cascade rules.
- [ ] Budget creation is current-month only; past budgets are editable; future budget creation is rejected.
- [ ] Rollover is non-negative; available budget may be negative.
- [ ] Tracker totals never affect monthly budget totals.
- [ ] Savings balances include soft-deleted fund transactions until permanent deletion.

## Schema alignment

- [ ] Queue lifecycle status has one source of truth.
- [ ] Category NULL/correction flag rules align with SQL constraints.
- [ ] Tracker transaction composite foreign key aligns with final table and index names.
- [ ] Permanent purge and associated audit deletion align with retention requirements.
- [ ] API payload fields align with final database column names and enum values.

## Execution safety

- [ ] No tests were run against a database as part of drafting this artifact.
- [ ] No migrations were applied and no database was changed.
- [ ] OpenAPI/schema validation and implementation tests are still pending.

## Reconciliation checks

- [ ] Category endpoints document per-user scopes, household-shared access, collision display, and join/leave behavior.
- [ ] Job status endpoints use `background_jobs` as the only lifecycle source.
- [ ] Annual export endpoints bind recipient and private Drive destination; download rechecks current access.
- [ ] All route entries declare cursor or page-number pagination (not both).
- [ ] Idempotency conflict, retention, replay, and pending-job behavior are documented.
- [ ] Stable error envelope is used consistently.
- [ ] OpenAPI is completed and validated before implementation readiness approval; validation has not yet been run.

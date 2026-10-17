# Budgetly — Stage 4 Artifact 2

## PostgreSQL table definitions and migration design

**Status:** Stage 4 design baseline complete; SQL is a non-executed draft and is not approved for direct production execution.
**Target:** Supabase PostgreSQL
**Business timezone:** `Asia/Kolkata` (business dates are stored as `date`; timestamps are `timestamptz`)
**Money:** `numeric(14,2)`; never floating point.
**IDs:** UUID.
**Prerequisite:** Reconciled Stage 4 ERD and decisions D1–D14; implementation-time static review and explicit execution approval are still required.

## Package contents

- `migrations/001_tables.sql` — schemas/tables, primary keys, base checks, and foreign keys.
- `migrations/002_indexes.sql` — unique, lookup, partial, and operational indexes.
- `migrations/003_integrity_functions.sql` — updated-at triggers, category compatibility, workspace ownership invariants, tracker/refund invariants, and job/detail consistency.
- `MIGRATION_PLAN.md` — ordering, assumptions, review notes, and what is deliberately excluded.
- `SCHEMA_REVIEW_CHECKLIST.md` — pre-implementation checks.

These are migration _files_, not a database change. They have not been executed.

## Important scope boundary

This artifact covers PostgreSQL table definitions and the migration plan. It does **not** enable RLS or create RLS policies; those belong in a separately reviewed artifact. Until that is done, the schema must not be exposed to client roles. Do not ship a client-accessible database without RLS.

Supabase-managed `auth.users` is referenced but not created here. Supabase Auth remains responsible for OTPs, passwords/session credentials, and auth sessions.

## Naming conventions

All application tables live in `public`. Names are snake_case. State columns use checked `text` rather than PostgreSQL enums so future state additions can be migrated with less friction. Monetary values are `numeric(14,2)`. Foreign-key delete actions are explicit.

## Important implementation notes

- Workspace ownership and personal-workspace cardinality use deferred constraint triggers because they are cross-row invariants that cannot be represented by a simple `CHECK`.
- Linked refund aggregate limits require row locking inside the write transaction; a `CHECK` constraint cannot enforce a sum across rows.
- RLS policies, API authorization, and security-definer function grants are described in Artifact 3 and must be reviewed together before implementation. The functions here are not a substitute for authorization.
- The annual export/backup scheduler and Google Drive/SMTP integrations are application/worker concerns, not solved by table DDL alone.
- The schema assumes a workspace can be `personal` or `household`. A household may have any number of active members but exactly one active owner; a personal workspace has exactly one active owner/member.

## Reconciliation update — 12 October 2026

Product-owner decisions incorporated: custom categories use household-user scope (not app-wide); annual Google Drive exports are generated independently for each authorized user into that user’s own Drive; idempotency results are retained for at least 24 hours after terminal completion; pagination is mixed by endpoint (cursor for transactions/history, page-number for simple lists/reports; default 20, maximum 100). Background job lifecycle status is owned by `background_jobs`. This remains design-only: no tests were executed and no migrations/database changes were made.

## Reconciliation decisions (design draft)

- Category scopes are per-user; `workspace_category_scopes` is many-to-many. Household membership links the household workspace to each active member's scope without merging category rows.
- Duplicate names across different scopes are permitted; UI labels disambiguate by category owner. Uniqueness remains case-insensitive within a scope and built-in names are globally reserved.
- `background_jobs` owns status/attempt/timing lifecycle. `export_jobs` and `backup_runs` store task-specific fields only.
- Export detail rows identify the authorized recipient and Drive file ID; Drive credentials must never be stored in job rows or logs.
- All SQL remains unexecuted draft material. The DDL requires a full static consistency review before any separately approved execution.

## Labels

Labels are optional reusable names scoped to a workspace, not categories. The draft schema stores them in `public.labels` and references them through nullable `public.transactions.label_id`. Names are trimmed and compared case-insensitively for active uniqueness within one workspace.

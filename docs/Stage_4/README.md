# Budgetly Stage 4 — Reconciled Design Drafts

This package contains the cross-artifact reconciliation and updated design drafts for Artifacts 1–5.

## Selected low-complexity defaults

- Per-user category scopes linked to personal/household workspaces; no category-row merges.
- One authoritative background-job lifecycle table.
- Next.js server handlers plus a small set of transactional database functions; no separate backend service.
- One daily Vercel Cron route processing a durable database queue.
- Private, per-user Google Drive annual exports with authenticated Budgetly download links.
- Configurable application-level rate limits.
- Additive-first migration plan and disposable test environment after separate approval.

## Status and restrictions

Design-only. SQL is still a draft and has not been executed. No database was connected to or changed, no tests were executed, no OAuth connections/secrets/cron jobs were created, and Stage 6 has not started. Stage 4 implementation readiness is not approved.

## Reusable labels addendum

This revision adds workspace-scoped reusable transaction labels across the ERD, draft SQL, RLS, API schemas, and planned test coverage. See `LABELS_PRD_ADDENDUM.md`. The canonical PRD is present at `docs/PRD.md` and already contains the label requirements; the earlier claim that it was absent was incorrect for this repository. No tests or migrations were run or applied.

# Budgetly — Coding Agent Instructions

## Project purpose

Budgetly is a private, mobile-first household expense tracker for two users. Its tagline is “Spend wisely. Save confidently.”

## Source of truth

Before implementing a feature, consult the relevant approved documents under `docs/`.

- Stage 1: product ideation and scope.
- Stage 2: product requirements and business rules.
- Stage 3: system design and architecture.
- Stage 4: database, API contracts, and cross-artifact reconciliation.

Follow the latest explicitly approved decisions and reconciled design. If documents conflict or a requirement is unclear, stop and ask rather than inventing a rule.

Do not treat design drafts as proof that implementation or tests have passed.

## Technology

- Next.js with TypeScript and App Router.
- pnpm only.
- Tailwind CSS.
- Vitest and React Testing Library for unit and component tests.
- Playwright for browser-based end-to-end tests.
- Supabase for PostgreSQL, authentication, and database-enforced access controls.
- GitHub Actions for pull-request validation.
- Vercel for deployment.

## UI

Use the approved Budgetly palette:

- Primary: #176B57
- Background: #FAF9F6
- Soft green: #8CBF9F
- Main text: #202A27
- Secondary text: #69746F
- Card surface: #FFFFFF
- Border: #E4E9E5
- Light teal: #E7F1EC

Follow the Stitch designs as visual references while preserving approved product requirements.

## Development rules

1. Inspect existing files before editing.
2. Implement small, focused changes.
3. Write or update tests alongside each feature.
4. Run lint, type checking, relevant unit tests, and applicable Playwright tests.
5. Report commands executed and their actual results. Never claim a test passed without running it.
6. Use sample data until real persistence is explicitly implemented.
7. Never commit secrets, expose service-role keys, or bypass authorization and database access controls.
8. Do not run migrations, modify or delete real data, commit, push, or deploy without explicit user approval.
9. Do not add unnecessary dependencies or services.
10. Report assumptions, unresolved conflicts, and any deviations from approved documents.

## Financial correctness

Preserve the approved Budgetly rules for expenses, refunds, monthly budgets, savings, trackers, workspaces, trash, and audit history. Consult the requirements and database/API documents before changing financial behavior.

## Git and CI

Use feature branches and pull requests. The intended GitHub Actions pipeline must run linting, TypeScript checks, unit tests, and Playwright tests. Keep the workflow consistent with the actual package scripts and committed pnpm lockfile.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

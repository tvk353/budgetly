# Budgetly

**Spend wisely. Save confidently.**

Budgetly is a private, mobile-first household expense tracker designed for two
users, with a shared Household workspace and individual Personal workspaces.
It brings everyday expenses, monthly budgets, savings goals, and independent
spending trackers into one interface.

## Current status

Budgetly is currently a **sample-data UI prototype**, not a production financial
system. The repository includes:

- Email-entry and OTP-verification screens.
- Household and Personal workspace selection.
- A household dashboard and searchable transactions ledger.
- An Add Expense form with category, label, date, description, and notes.
- Inline category and label creation with an icon picker.
- Monthly budget, savings, trackers, and More screens.

Authentication screens do not yet provide real authentication. Transactions,
categories, and labels are not persisted to Supabase and may be lost on refresh.
Some actions are placeholders. Do not use this version to store real financial
or personal information.

Supabase authentication, PostgreSQL persistence, database-enforced authorization,
refund workflows, Trash recovery, exports, backups, and PWA app-lock capabilities
are planned work, not completed features. See the
[implementation handoff](docs/AI_HANDOFF.md) for details.

## Technology

| Area                     | Technology                                         |
| ------------------------ | -------------------------------------------------- |
| Application              | Next.js 16 App Router, React 19, TypeScript        |
| Styling                  | Tailwind CSS 4, Manrope                            |
| Unit and component tests | Vitest, React Testing Library, jsdom               |
| Browser tests            | Playwright with Chromium                           |
| Code quality             | ESLint, Prettier                                   |
| Package manager          | pnpm 11                                            |
| Automation               | GitHub Actions, hosted Renovate App                |
| Planned backend          | Supabase PostgreSQL, email OTP, Row Level Security |
| Planned deployment       | Vercel                                             |

Exact dependency versions and available scripts are defined in
[`package.json`](package.json).

## Local development

### Prerequisites

- Node.js 24, matching CI.
- pnpm 11, compatible with the package-manager version declared in
  [`package.json`](package.json).
- Git.

Use pnpm for dependency management and keep the committed
[`pnpm-lock.yaml`](pnpm-lock.yaml) in sync with dependency changes.

### Run the app

```powershell
git clone https://github.com/tvk353/budgetly.git
cd budgetly
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://127.0.0.1:3000>.

The current sample-data interface does not require Supabase credentials or an
environment file. Backend setup will need separate documentation when it is
implemented. Never commit credentials or expose a Supabase service-role key in
client code.

### Production build

```powershell
pnpm build
pnpm start
```

The production server also listens at <http://127.0.0.1:3000>.

## Available commands

| Command                         | Purpose                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                      | Start the local Next.js development server                                   |
| `pnpm build`                    | Create a production build                                                    |
| `pnpm start`                    | Serve the production build                                                   |
| `pnpm lint`                     | Run ESLint                                                                   |
| `pnpm typecheck`                | Check TypeScript types without emitting files                                |
| `pnpm test`                     | Run unit and component tests once                                            |
| `pnpm test:watch`               | Run unit and component tests in watch mode                                   |
| `pnpm e2e`                      | Run Playwright browser tests                                                 |
| `pnpm format:check`             | Check formatting                                                             |
| `pnpm format`                   | Rewrite files using Prettier                                                 |
| `pnpm audit --audit-level high` | Run the CI dependency audit with the documented withdrawn-advisory exception |

### Browser test setup

Install Chromium before running browser tests:

```powershell
pnpm exec playwright install chromium
pnpm e2e
```

On Linux, install browser system dependencies with
`pnpm exec playwright install --with-deps chromium`.

Playwright starts the development server automatically and reuses an existing
server locally. Its settings are in
[`playwright.config.ts`](playwright.config.ts). Test commands above describe
available checks; they are not a claim that the current checkout has passed them.

## Project structure

- [`app/`](app/) - App Router pages, layouts, and global styles.
- [`components/`](components/) - Reusable interface components and component tests.
- [`lib/`](lib/) - Shared application utilities and supporting logic.
- [`tests/`](tests/) - Playwright end-to-end tests.
- [`docs/`](docs/) - Product scope, approved requirements, architecture, and backend designs.
- [`.github/workflows/`](.github/workflows/) - GitHub Actions automation.
- [`.github/renovate.json`](.github/renovate.json) - Dependency-update configuration.

## CI and dependency updates

The [Budgetly CI workflow](.github/workflows/ci.yml) runs on pushes to `main` and
pull requests targeting `main`. It installs dependencies with a frozen lockfile,
checks for high- and critical-severity dependency vulnerabilities, checks
formatting, runs linting and TypeScript checks, runs unit tests, builds the app,
and runs Playwright tests.

The audit temporarily excludes only
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
the withdrawn `braces` advisory still returned by npm. The exception is defined
in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) so local and CI audits use the
same policy. Remove it when the registry stops reporting the advisory. All other
high- and critical-severity advisories continue to fail CI.

The hosted [Renovate GitHub App](https://github.com/apps/renovate) is configured
with its recommended preset to open dependency-update PRs, including supported
pnpm and GitHub Actions updates. **Automatic merging is disabled**: review the
changes and CI results before merging manually.

Renovate requires the App to have access to this repository and its configuration
to be merged into the default branch. It runs independently of CI and does not
need a scheduled workflow or repository token secret.

## Product documentation

Consult the approved documents before changing financial behavior or implementing
backend features:

1. [Stage 1: Ideation and scope](docs/IDEATION.md).
2. [Stage 2: Product requirements and business rules](docs/PRD.md).
3. [Stage 3: System design](docs/SYSTEM_DESIGN.md).
4. [Stage 4: Database, authorization, API contracts, and reconciliation](docs/Stage_4/README.md).
5. [Current UI implementation handoff and unresolved work](docs/AI_HANDOFF.md).

Design documents describe intended behavior; they do not prove that a feature is
implemented or that its tests have passed. Follow the latest approved,
reconciled decisions and clarify conflicts before implementing changes.

## Contributing

- Use feature branches and pull requests.
- Keep changes focused and add or update relevant tests.
- Run formatting, linting, type checks, unit tests, and applicable browser tests.
- Preserve approved financial rules and distinguish sample data from real persistence.
- Do not run database migrations, modify real data, commit, push, or deploy without
  explicit approval.

# Budgetly

**Spend wisely. Save confidently.**

Budgetly is a private, mobile-first household expense tracker with a shared
Household workspace and individual Personal workspaces. It brings everyday
expenses, monthly budgets, savings goals, and independent spending trackers
into one interface.

## Current status

Budgetly is currently a **sample-data UI prototype**, not a production financial
system. The repository includes:

- Email-entry and OTP-verification screens.
- Household and Personal workspace selection.
- A household dashboard and searchable transactions ledger.
- An Add Expense form with category, label, date, description, and notes.
- Inline category and label creation with an icon picker.
- Monthly budget, savings, trackers, and More screens.

Email OTP authentication now uses real Supabase Auth. Transactions,
categories, and labels are not persisted to Supabase and may be lost on refresh.
Some actions are placeholders. Do not use this version to store real financial
or personal information.

The first backend slice adds local Supabase configuration, a limited workspace
schema/RLS migration, cookie-based SSR session validation, and authenticated
workspace read APIs. Login, verification, logout and protected pages use real
sessions; financial screens still display sample data. Transaction persistence,
household provisioning/invitations, refund workflows, Trash recovery, exports, backups,
and PWA app-lock remain unimplemented. See the
[implementation handoff](docs/AI_HANDOFF.md) for details.

## Technology

| Area                     | Technology                                        |
| ------------------------ | ------------------------------------------------- |
| Application              | Next.js 16 App Router, React 19, TypeScript       |
| Styling                  | Tailwind CSS 4, Manrope                           |
| Unit and component tests | Vitest, React Testing Library, jsdom              |
| Browser tests            | Playwright with Chromium                          |
| Code quality             | ESLint, Prettier                                  |
| Package manager          | pnpm 12                                           |
| Automation               | GitHub Actions, hosted Renovate App               |
| Backend foundation       | Supabase PostgreSQL, Auth session validation, RLS |
| Planned deployment       | Vercel                                            |

Exact dependency versions and available scripts are defined in
[`package.json`](package.json).

## Local development

### Prerequisites

- Node.js 24, matching CI.
- pnpm 12, compatible with the package-manager version declared in
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

The login screen renders without credentials, but sign-in and protected routes require setup. Backend requests fail
explicitly with `503 BACKEND_NOT_CONFIGURED` until configured; they never fall
back to sample data.

### Local Supabase foundation

Docker Desktop must be running with Linux containers. The repository pins the
Supabase CLI through pnpm. These commands use local containers only; do not use
`supabase link`, `db push`, or a remote database URL.

```powershell
pnpm db:start
pnpm exec supabase status
Copy-Item .env.example .env.local
# Edit .env.local: use the local API URL and sb_publishable_* key from status.
# Also set SUPABASE_SECRET_KEY (local sb_secret_*), APP_ORIGIN, and AUTH_RATE_LIMIT_SECRET.
# Generate the rate-limit secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
pnpm db:lint
pnpm db:test
pnpm dev
```

Starting a fresh local stack applies the migration in
[`supabase/migrations/`](supabase/migrations/). No seed or financial tables are
included. `pnpm db:stop` stops the local stack without deleting its data.
Do not reset an existing local database without checking for data you need.
No remote project is created or modified by these setup instructions.

The regular user client accepts only publishable keys, excluding legacy JWT keys.
`SUPABASE_SECRET_KEY` is server-only and used exclusively for the narrow OTP
rate/attempt RPC, never workspace reads. `AUTH_RATE_LIMIT_SECRET` must be random,
at least 32 characters, and stable across instances. It HMAC-hashes emails/IPs
before storage. Never prefix either secret with `NEXT_PUBLIC_`.
`APP_ORIGIN` is the exact browser origin (locally `http://127.0.0.1:3000`),
without a trailing slash, used for CSRF checks; do not derive it from caller headers.
Session cookies are HttpOnly and use `SameSite=Lax` and `Secure` for HTTPS. The UI
uses server endpoints, not browser SDK token storage. OTP challenge cookies
are HttpOnly, SameSite=Strict and expire in five minutes.

#### Troubleshooting authentication configuration

`.env.example` is a template, not a file Next.js loads. Create `.env.local` in
the repository root and populate all five variables before signing in:

- `NEXT_PUBLIC_SUPABASE_URL`: the running local instance's API URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: that instance's `sb_publishable_*` key,
  not its legacy anon JWT.
- `APP_ORIGIN`: the exact browser origin, normally `http://127.0.0.1:3000`.
- `SUPABASE_SECRET_KEY`: that instance's server-only `sb_secret_*` key.
- `AUTH_RATE_LIMIT_SECRET`: a persistent random secret of at least 32 characters.

Stop and restart `pnpm dev` after changing environment variables, then reload
the login page. Keep `.env.local` ignored by Git and never paste keys or
unredacted Supabase status output into logs or bug reports.

`503 AUTH_NOT_CONFIGURED` means `APP_ORIGIN` is absent, or the server secret
key/rate-limit secret fails validation; it is raised before contacting Auth.
Missing or invalid public Supabase configuration instead returns
`503 BACKEND_NOT_CONFIGURED`. With valid configuration, limiter/database or Auth
provider failures return `503 AUTH_UNAVAILABLE`; rate limiting returns `429`.
For local service diagnosis, check `supabase_auth_budgetly` container health and
the local `/auth/v1/health` endpoint using the publishable key without logging it.
Do not weaken validation or reset the database to fix a missing environment file.

Implemented routes:

- `GET /api/v1/workspaces?page_number=1&limit=20`: page-number collection,
  default 20, maximum 100, stable creation-time/ID order.
- `GET /api/v1/workspaces/{workspaceId}`: authorized workspace detail; missing,
  foreign, deleted, and removed-member resources all return `404`.
- `POST /api/v1/workspaces/selection`: same-origin JSON `{ "workspace_id": "<uuid>" }`;
  validates active membership before saving an HttpOnly selection preference.

Both require a real Supabase cookie session and an active Budgetly profile.
The server validates identity through `auth.getUser()`, checks the profile,
and selects only current active memberships using the user's client; RLS
independently enforces isolation. Successes and errors are private/no-store.
Provider failures are explicit sanitized errors, not empty successful lists.
Next.js Proxy refreshes protected page sessions, forwarding rotated cookies to
the render and browser. Server pages independently validate the active profile
and required workspace membership. API handlers validate their own sessions;
they do not trust Proxy or client user IDs.

### Email OTP setup

Local emails are delivered to Mailpit at <http://127.0.0.1:54324>, not to a real
inbox. Enter an email on `/`, copy the six-digit code from Mailpit, and verify on
`/verify`. No demo email/code is accepted. First verified login atomically
creates an active profile, category scope and private Personal workspace.
It never grants Household membership; a trusted local SQL transaction is still
needed to create a household and initial owner or add a test household member.
The selector loads real workspace names and IDs through the authenticated API,
including all pages, rather than deduplicating memberships by type. Household is
the default only with active Household membership; otherwise Personal is the
default. The exact selection persists across the existing routes and reloads.
Every protected workspace page rechecks membership; a removed, deleted, foreign,
or malformed selection redirects to the selector rather than silently switching
workspaces. Login/logout clear the previous account's preference. The cookie is
never an authorization credential.

**Onboarding boundary:** Personal provisioning locks the verified user's Auth row,
so overlapping first-login calls serialize without creating duplicate profiles,
scopes or Personal workspaces. Household creation and joining remain unavailable:
the live schema has no invitation table, hashed-token lifecycle/delivery, or trusted
create/revoke/join transaction implementing the approved seven-day, email-bound
invitation rules. This slice uses the Personal-first fallback; it never creates
Household memberships automatically. Existing authorized Households are loaded.
Financial screens remain explicitly sample-only; no expense persistence is added.

`POST /api/v1/auth/otp/request` and `/otp/verify` use same-origin JSON. The server
enforces a five-minute browser-bound challenge, three attempts, 60-second resend
cooldown, five sends/account/hour and twenty/IP/hour in PostgreSQL. The configured
provider supplies single-use codes and five-minute expiry. `POST /api/v1/auth/logout`
revokes the current session's refresh token and clears its cookies. Unauthenticated
logout returns `401`; full navigation discards cached authenticated pages.
Supabase access JWTs already issued can remain valid until expiry; logout-all,
immediate stolen-token revocation and account lifecycle flows are not implemented.

After changing local Auth config, stop/start Supabase (without resetting data).
On an existing local database, apply new migrations with
`pnpm exec supabase migration up --local`.

Before a hosted rollout, manually configure Supabase Auth: enable email signup
and confirmation, set OTP expiry to **300 seconds**, six-digit codes and a
**60-second** email cooldown; set both **Confirm signup** and **Magic Link** email
templates to show `{{ .Token }}` (the local template is in
[`supabase/templates/email-otp.html`](supabase/templates/email-otp.html)).
Configure approved SMTP and delivery limits, Site URL and exact redirect allowlist.
Set the four Supabase/app environment variables plus the rate-limit secret in
Vercel, and apply reviewed migrations only after deployment approval.
No hosted dashboard settings are changed by this repository.

**Deployment boundary:** per-IP controls trust only Vercel's overwritten
`x-vercel-forwarded-for`; local development intentionally shares one IP bucket.
Other hosting requires an explicitly trusted proxy/IP configuration before rollout.
The three-attempt challenge limit protects Budgetly's endpoints, not direct calls
to the public Supabase Auth API. Provider rate limits/CAPTCHA must also be
configured; Supabase's standard OTP API does not enforce a per-code three-attempt
cap. Strict enforcement against direct-provider calls remains a production
security gate, not a verified property of this implementation.

[`supabase/tests/workspace_authorization.test.sql`](supabase/tests/workspace_authorization.test.sql)
uses rollback-only fixtures in the disposable local database to test grants,
ownership, scope integrity, isolation, removed/deleted access and default ACLs.
Only the migration creator `postgres` is covered by default ACLs. Every future
table still needs explicit RLS, grants and tests; introducing another creator
role requires equivalent default-privilege verification.
The Stage 4 draft financial/lifecycle SQL has **not** been promoted wholesale:
unresolved financial/API and purge decisions do not block these read APIs.

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
| `pnpm db:start`                 | Start disposable local Supabase and apply local migrations                   |
| `pnpm db:stop`                  | Stop local Supabase without deleting its data                                |
| `pnpm db:lint`                  | Lint the running local database                                              |
| `pnpm db:test`                  | Run local rollback-only pgTAP authorization tests                            |
| `pnpm format:check`             | Check formatting                                                             |
| `pnpm format`                   | Rewrite files using Prettier                                                 |
| `pnpm audit --audit-level high` | Run the CI dependency audit with the documented withdrawn-advisory exception |

### Browser test setup

Install Chromium before running browser tests:

```powershell
pnpm exec playwright install chromium
pnpm e2e
```

Browser tests now require Docker and the local Supabase stack:

```powershell
pnpm db:start
$env:BUDGETLY_LOCAL_AUTH_TESTS = '1'
pnpm e2e --workers=1
```

This opt-in reads local CLI credentials into the test server environment only;
it refuses a non-local API URL. Tests create and clean disposable users/workspaces.
Real OTP tests read only their own Mailpit messages. CI starts its own local stack.

On Linux, install browser system dependencies with
`pnpm exec playwright install --with-deps chromium`.

With local Auth tests enabled, Playwright starts an isolated test server on port
3100 using `.next-e2e`, leaving the normal development server alone. Its settings are in
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

# AI Handoff

## Current Backend Status (2026-10-26)

- Email OTP login, verification, logout, protected pages, and workspace
  reads now use real Supabase Auth and database-enforced authorization.
  Financial screens and transaction/category/label changes remain sample-only.
- Verified OTP login calls the authenticated `ensure_household_workspace()` RPC.
  Only `priyavinod.t@gmail.com` can automatically create a Household, as its
  active owner; other users need existing active Household membership. Missing
  membership fails closed and revokes the newly established session.
- Provisioning serializes on the verified Auth row and uses a private unique
  onboarding mapping. It preserves Personal and its scope/membership, adopts an
  existing owned Household, and never restores removed/deleted access or transferred
  ownership. Invitation joining and general-purpose creation remain unimplemented.
- Successful OTP verification selects the authorized Household and navigates directly
  to `/workspace/household`. The selector remains available for explicit switching.
  Migration `20261026000100_household_provisioning.sql` is required before rollout;
  its presence is not evidence of production application or test success.
- Workspace selection uses real names and IDs and persists the exact selection
  in an HttpOnly cookie across routes and reloads. Each protected page rechecks
  membership; removed, deleted, foreign, or malformed selections cannot grant
  access. Login replaces the previous selection with Household; logout clears it.
- Logout revokes the current refresh token and clears session cookies. Already
  issued access JWTs can remain valid until expiry; logout-all, immediate
  stolen-token revocation, and account lifecycle flows remain unimplemented.

## Completed Screens and Routes

1.  **Login & OTP Verification**: `/` (Welcome & Email entry), `/verify`
    (6-digit OTP verification).
2.  **Workspace Selection**: `/workspaces` (Shared Household vs. Private
    Personal workspace selection).
3.  **Household Dashboard**: `/workspace/household` (Key metrics, donut
    gauge, safe daily spend, recent transactions, quick actions, and a
    circular `+` action at the bottom-right to open Add Expense).
4.  **Transactions Ledger**: `/transactions` (Search, date range filter,
    category filter, expense/refund tab filters, compact INR amounts,
    and Add Expense / Add Refund entry points).
5.  **Add Expense and Add Refund**: Add Expense is opened from the Home
    bottom-right `+` button and Transactions screen actions. It includes
    amount, Category dropdown, optional Label dropdown, date, optional
    description, and optional notes. Category and Label dropdowns
    support inline `+` actions for creating custom entries and selecting
    a predefined icon. Add Refund supports linked and unlinked refunds,
    inherits the linked expense category, and enforces its remaining
    refundable amount. Both flows are mock-only and in-memory.
    The Stitch-only "Credited to / Received by" selector is omitted
    because the approved PRD does not define that field. The Home action
    remains a circular `+` only; do not add "Add Transaction" text.
6.  **Monthly Budget**: `/budget` (Stitch-aligned formula ledger,
    available surplus/deficit, progress bar, 6 category envelopes with
    refund adjustments, month navigation between past, current, and
    upcoming months, policy notice).
7.  **Savings Dashboard**: `/savings` (Stitch-aligned isolation notice,
    total pooled savings hero card with monthly growth metric, 3 active
    fund goal cards with progress bars and target amounts, quick
    actions: New Fund, Deposit, Withdraw, recent savings
    deposits/withdrawals ledger).
8.  **More Hub**: `/more` (Stitch-aligned user profile card with avatar
    and status, Features & Insights bento shortcuts, Household
    Stewardship with valid link to `/workspaces`, Data & Ledger Vault
    shortcuts, Preferences & Security with real Sign Out action, app
    version stamp, and active More bottom navigation).
9.  **Trackers Dashboard**: `/trackers` (Stitch-aligned info banner,
    Create Tracker CTA, segmented Active/Ended/Hidden filter tabs,
    active tracker cards with financial metrics grid (Net Spent /
    Remaining Cap), progress bar with near-limit warning, recent expense
    chips, View Details + Add Expense actions, ended tracker cards with
    Reopen button. PRD-compliant: no required dates, independent of
    budget/savings, ended = read-only until reopened. Bottom navigation
    active tab = "more" per Stitch comment. Mock banners for
    unimplemented create/add/view actions.)

## Add Expense, Categories, and Labels

- **Home entry point**: Use a circular `+` button fixed/positioned at
  the bottom-right. Do not display an "Add Transaction" label.
- **Form fields**: Amount (required), Category (required), Label
  (optional), Date (required; today or earlier), Description
  (optional, maximum 50 characters), Notes (optional, maximum 500
  characters).
- **Category dropdown**: Supports selecting an existing category,
  creating a custom category with the inline `+` action, and choosing
  a predefined icon.
- **Label dropdown**: Supports selecting an existing label, creating a
  custom label with the inline `+` action, and choosing a predefined
  icon.
- **Label rules**: Labels are optional, reusable across all
  categories, and independent of category. For example, `Amazon` may
  be used with both Groceries and Shopping. Labels should be
  workspace-scoped, trimmed, and matched case-insensitively to prevent
  duplicate active names within the same workspace.
- **Initial label choices**: Amazon, Flipkart, Reliance, Zepto,
  Swiggy, Zomato, Blinkit, Airtel, Bigbasket, Breakfast, Dinner,
  Lunch, Car, Cash, Chicken, Eggs, Vegetables, Electricity, Fish,
  Mutton, Gas, Gym, Salon, JioMart, Medicines, Myntra, Nykaa, Ola,
  Uber, Rapido, Sid's Farm, Swimming, Teeth, Urban Company. Confirm
  spelling/casing against the canonical requirements when implementing
  seed data.
- **Icons**: V1 uses the predefined in-app icon picker. Real brand
  logos are deferred to V2. Use a fallback icon when a specific icon
  is unavailable.
- **Current implementation status**: UI changes are mock-only;
  categories, labels, icons, and created transactions are not yet
  persisted to Supabase and may not survive refresh. Do not claim
  persistence until backend integration is implemented.
- **Label deletion**: Removing a label must not delete its associated
  transactions. Label filtering/report integration should be
  implemented with the relevant transaction/report work.

## Important Component and Design Conventions

- **Design System & Palette**:
  - Primary: `#176B57` (`--color-primary`)
  - Background: `#FAF9F6` (`--color-background`)
  - Soft green: `#8CBF9F` (`--color-soft-green`)
  - Main text: `#202A27` (`--color-main-text`)
  - Secondary text: `#69746F` (`--color-secondary-text`)
  - Card surface: `#FFFFFF` (`--color-card-surface`)
  - Border: `#E4E9E5` (`--color-border`)
  - Light teal: `#E7F1EC` (`--color-light-teal`)
- **Layout & Sizing**:
  - Mobile-first container capped at
    `max-w-[393px] mx-auto min-h-screen`.
  - Docked header with safe-area spacing and backdrop blur
    (`backdrop-blur-md`).
  - Shared bottom navigation docked at `bottom-0`
    (`HouseholdBottomNavigation` with all 5 destinations: `home`,
    `transactions`, `budget`, `savings`, `more`).
- **Navigation & Unavailable Destinations**:
  - Only link to existing approved routes (`/workspace/household`,
    `/transactions`, `/budget`, `/savings`, `/more`, `/trackers`,
    `/workspaces`, `/`).
  - Keep unfinished destinations visibly unavailable with accessible
    tooltips/titles and dismissible feedback notifications rather
    than broken links.
  - Trackers (`/trackers`) is reachable from the More Hub; its
    bottom nav tab = `more` per Stitch design comment.

## Financial Rules

- **Monthly Budgets (PRD Section 3)**:
  - Applicable Budget = Base Budget + Rollover (Rollover ≥ 0).
  - Net Eligible Expenses = Expenses − Refunds.
  - Available Budget = Applicable Budget − Net Eligible Expenses
    (allows negative surplus/deficit).
  - Past months can be edited for corrections; new monthly budgets
    can only be created for the active current month.
- **Savings (PRD Section 4)**:
  - Savings funds and transactions are completely isolated from
    budgets and trackers.
  - Transactions are strictly deposits or withdrawals (positive
    amounts, non-future dates).
  - Balance = Deposits − Withdrawals (negative balances are
    allowed).
- **Trackers (PRD Section 5)**:
  - Net Spending = Gross Expenses − Refunds.
  - Remaining Cap = Cap − Net Spending (negative when over cap); cap
    is optional.
  - Utilization % = Net Spending / Cap × 100 (capped at 100%).
  - Trackers are independent of budgets and savings; no mandatory
    start/end dates.
  - Ended trackers are read-only until explicitly reopened.
- **Expenses**:
  - Store amounts as integer paise and display INR.
  - Category is required; Label is optional and does not affect
    budget calculations.
  - Expense dates cannot be in the future.

## Auth Configuration and Hosted Deployment

- [`.env.example`](../.env.example) lists the five application variables:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `APP_ORIGIN`, `SUPABASE_SECRET_KEY`, and `AUTH_RATE_LIMIT_SECRET`.
  Public and server keys must belong to the same Supabase instance.
- The public client accepts only `sb_publishable_*`; the OTP limiter uses a
  server-only `sb_secret_*` key. Legacy anon/service-role JWT variables are not
  substitutes. Never expose server secrets through `NEXT_PUBLIC_*`.
- `APP_ORIGIN` must exactly match the browser origin without a trailing slash.
  Use HTTPS for production. The rate-limit secret must be cryptographically
  random, at least 32 characters, persistent, and shared across app instances.
- The local `AUTH_NOT_CONFIGURED` issue was caused by a missing `.env.local`.
  An ignored local file was created using the running local instance's keys.
  Next.js picked it up without a process restart. For future changes, restart
  local development explicitly; Vercel environment changes require a new build/
  deployment. Never commit the local file or reuse local credentials in production.
- Error boundaries: missing origin or invalid server/rate-limit secrets produce
  `503 AUTH_NOT_CONFIGURED`; invalid public configuration produces
  `503 BACKEND_NOT_CONFIGURED`; limiter/provider failures produce
  `503 AUTH_UNAVAILABLE`; rate limiting returns `429`.
- Local emails go to Mailpit at <http://127.0.0.1:54324>, not real inboxes.
  Hosted Auth requires custom SMTP with a verified sender/domain. Configure
  SMTP credentials in Supabase, not application public variables.
- Hosted settings must be configured explicitly; local
  [`supabase/config.toml`](../supabase/config.toml) does not automatically apply
  them. Enable email signup and confirmation, disable anonymous signup, use
  six-digit OTPs with 300-second expiry and a 60-second resend cooldown, and
  enable refresh-token rotation (local reuse interval: 10 seconds).
  Both signup confirmation and magic-link/OTP templates must include
  `{{ .Token }}`; see [email template](../supabase/templates/email-otp.html).
  Set the Site URL to the canonical application origin and review SMTP limits.
- The server enforces a five-minute browser-bound challenge, three verification
  attempts, five sends/account/hour, and twenty sends/IP/hour through PostgreSQL.
  Vercel supplies `VERCEL=1`; verify its trusted `x-vercel-forwarded-for` request
  header during hosted smoke testing. Do not enable `BUDGETLY_LOCAL_AUTH_TESTS`
  in production or expose the `private` schema through the Data API.
- Actual Vercel dashboard variables and hosted Supabase settings have not been
  inspected or changed. No remote connection, migration, deployment, or
  production-data operation was performed.

## Foundation Migrations and Clean Replay

Apply only these implementation migrations, in order:

1. [`20261025000100_workspace_foundation.sql`](../supabase/migrations/20261025000100_workspace_foundation.sql):
   profiles, workspaces/memberships, category scopes, integrity triggers, RLS,
   and restricted grants/default privileges.
2. [`20261025000200_email_auth.sql`](../supabase/migrations/20261025000200_email_auth.sql):
   private challenge/rate-limit tables, OTP limiter, Personal provisioning, and
   deferred integrity trigger security fixes.

- `public.consume_otp_limit(text,text,text,uuid)` is executable only by
  `service_role`; `public.ensure_personal_workspace()` is executable by
  `authenticated`. Both are security-definer functions with empty search paths.
  Foundation triggers/helpers and their grants are also required for first login.
- Existing local history records both versions, but the second migration's
  historical statements differ from its current file. Inspected live local
  function bodies match current source. History was not edited to hide this.
- A separate clean Supabase project, `budgetly_replay_c24c598f`, replayed the
  exact source files using API port 55421, DB port 55422, and Mailpit port 55424.
  Both freshly recorded migrations matched normalized source SQL. Migration
  bytes were unchanged; no additional migration fix was needed.
- The existing local database was not reset or written to during replay/testing.
  Disposable containers, volumes, temporary credentials, and source snapshot
  were removed afterwards. The original stack and development server remained
  running.
- Do not apply Stage 4 SQL design drafts as extra deployment migrations. This
  foundation does not implement the full financial schema.

## Testing and Validation (2026-10-25)

Executed results for the auth/workspace foundation:

- Disposable stack: `pnpm exec supabase start --workdir $replay` applied both
  migrations from scratch; `migration list --local --workdir $replay` confirmed
  their versions. The attempted service exclusions were ignored by the CLI;
  all enabled services started and were subsequently cleaned up.
- `pnpm exec supabase db lint --local --workdir $replay --schema public,private --level warning --fail-on warning`:
  passed with no schema errors.
- `pnpm exec supabase test db --workdir $replay`: 81 assertions passed across
  three files, including RLS/grants, OTP limits, verified provisioning,
  idempotency, and membership isolation. Two extension-grant warnings were
  non-failing. All eight application tables had RLS enabled.
- Focused Vitest run: 94 tests passed across 12 files using
  `--maxWorkers=1 --pool=threads`, covering auth, Supabase clients/session/proxy,
  workspaces/selection/client, and login/verification/sign-out/selection components.
  An earlier fork-pool run had a worker-startup timeout; the complete rerun passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `git diff --check` passed.
  The standard `pnpm run build` passed in the isolated snapshot.
- `pnpm exec playwright test 'email-auth.spec.ts' 'workspace-api.spec.ts' 'workspace-onboarding.spec.ts' 'login-flow.spec.ts' --workers=1`:
  all 16 tests passed against a production build pointed at the disposable stack.
  Coverage included real emailed OTP, invalid codes/attempt exhaustion, session
  refresh/logout, selection isolation, removed/deleted memberships, and concurrent
  first-login provisioning.
- Browser fixtures currently hardcode normal local ports and container names.
  Only the disposable source copy was retargeted to the alternate stack and
  production server; repository infrastructure configuration was unchanged.
  Snapshot dependency resolution initially failed; dependencies were restored
  offline with the frozen lockfile. Dependency manifests remained unchanged.
- The initial dev-server browser run had four failures. The production-build
  rerun passed all 16. The OTP helper now waits for the request response and
  asserts `202` before checking navigation, avoiding its observed cold-start race.
- This was a focused validation, not a full Vitest or full Playwright suite.
  Add Expense/refund-specific browser specs were not rerun in this pass.
  No hosted SMTP, Vercel proxy behavior, or remote database was validated.

Playwright uses `testDir: './tests'`. Normal local auth browser runs require
Docker, the local Supabase stack, and `BUDGETLY_LOCAL_AUTH_TESTS=1`.
See [README setup and commands](../README.md). Keep feature specs separate.

## First Hosted Release Gates

1. Review and commit the intended working-tree changes, including currently
   untracked backend code, migrations, tests, and environment template, through
   the normal PR process. Exclude all secrets. No commit or push was performed.
2. Obtain separate approval before any remote connection or migration. Verify
   target project identity, PostgreSQL compatibility, existing schema/history,
   and backup/recovery capability before a targeted migration dry run.
3. This CLI can update Vault secrets during `db push`; use `--skip-vault` for
   the reviewed migration-only procedure. Do not include seed data or broad
   grants. Apply only the two reviewed migrations after explicit approval.
4. Configure hosted Auth/SMTP and Production-scoped Vercel variables, then build/
   deploy the reviewed commit. Keep preview environments isolated from production.
5. Before opening access, verify actual email delivery, first/repeat login,
   session refresh/logout, OTP limits, workspace isolation, and HTTPS cookie flags.
6. Keep access restricted until verification succeeds. Roll back the app to a
   compatible release, or use maintenance/access restriction for a first release.
   App rollback does not undo database changes. Both migrations are transactional,
   but the first can remain committed if the second fails. There are no down
   migrations: prefer a reviewed forward fix or separately approved verified
   backup restore, never a production reset or ad hoc schema drop.

## Dependency Update Automation

- Renovate is configured in [`.github/renovate.json`](../.github/renovate.json)
  for the hosted [Renovate GitHub App](https://github.com/apps/renovate).
- A repository administrator must install the App, selecting only
  `tvk353/budgetly`, and merge the configuration into the default branch.
  Until both steps are complete, this configuration does not activate the bot.
- The recommended preset detects supported dependencies, including pnpm
  packages and GitHub Actions, and creates a Dependency Dashboard issue.
  Related updates may be grouped into a single PR.
- Automatic merging is disabled. Review update PRs and their CI results,
  then merge manually. pnpm update PRs should include any required lockfile
  changes so the frozen-lockfile CI installation remains reproducible.
- The hosted App does not need a scheduled workflow or repository token
  secret. Its PRs targeting `main` run the existing CI workflow.

## Next Screen and Unresolved Decisions

- **Next feature**: Individual Tracker Detail view. Add Refund is
  implemented as a mock-only modal.
- **Backend integration**: Persist transactions, category
  administration, reusable workspace-scoped labels, and selected icons
  in Supabase; implement database constraints and RLS policies based
  on the updated Stage 4 design.
- **Other unresolved work**: Trash recovery (30-day retention), and
  annual Google Drive / CSV exports (PRD Sections 7, 8, 9).
- **Navigation**: Whether `/trackers` should get its own bottom-nav
  slot or remain under More (current: More is active per Stitch).

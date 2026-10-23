# AI Handoff

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
    shortcuts, Preferences & Security with Sign Out link to `/`, app
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

## Testing and Validation

- Existing reported baseline: Vitest had 66 tests passing across 9
  suites; TypeScript `tsc --noEmit` passed; ESLint passed; a Next.js
  production build succeeded before the latest Add Expense UI work.
- **Latest Add Expense/category/label changes have not been verified
  against the full local project in this handoff.** Run targeted
  Vitest and Playwright tests, `pnpm run typecheck`, and
  `pnpm run lint` after applying the patch.
- Playwright configuration uses `testDir: './tests'`; run E2E tests
  with `pnpm e2e`. Keep feature specs separate (for example
  `login-flow.spec.ts`, `home-add-expense.spec.ts`, and
  `transactions.spec.ts`) rather than placing all unrelated flows in
  `login-flow.spec.ts`.

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

# AI Handoff

## Completed Screens and Routes

1. **Login & OTP Verification**: `/` (Welcome & Email entry), `/verify` (6-digit OTP verification).
2. **Workspace Selection**: `/workspaces` (Shared Household vs. Private Personal workspace selection).
3. **Household Dashboard**: `/workspace/household` (Key metrics, donut gauge, safe daily spend, recent transactions, quick actions).
4. **Transactions Ledger**: `/transactions` (Search, date range filter, category filter, expense/refund tab filters, compact INR amounts).
5. **Monthly Budget**: `/budget` (Stitch-aligned formula ledger, available surplus/deficit, progress bar, 6 category envelopes with refund adjustments, month navigation between past, current, and upcoming months, policy notice).
6. **Savings Dashboard**: `/savings` (Stitch-aligned isolation notice, total pooled savings hero card with monthly growth metric, 3 active fund goal cards with progress bars and target amounts, quick actions: New Fund, Deposit, Withdraw, recent savings deposits/withdrawals ledger).
7. **More Hub**: `/more` (Stitch-aligned user profile card with avatar and status, Features & Insights bento shortcuts, Household Stewardship with valid link to `/workspaces`, Data & Ledger Vault shortcuts, Preferences & Security with Sign Out link to `/`, app version stamp, and active More bottom navigation).
8. **Trackers Dashboard**: `/trackers` (Stitch-aligned info banner, Create Tracker CTA, segmented Active/Ended/Hidden filter tabs, active tracker cards with financial metrics grid (Net Spent / Remaining Cap), progress bar with near-limit warning, recent expense chips, View Details + Add Expense actions, ended tracker cards with Reopen button. PRD-compliant: no required dates, independent of budget/savings, ended = read-only until reopened. Bottom navigation active tab = "more" per Stitch comment. Mock banners for unimplemented create/add/view actions.)

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
  - Mobile-first container capped at `max-w-[393px] mx-auto min-h-screen`.
  - Docked header with safe-area spacing and backdrop blur (`backdrop-blur-md`).
  - Shared bottom navigation docked at `bottom-0` (`HouseholdBottomNavigation` with all 5 destinations active: `home`, `transactions`, `budget`, `savings`, `more`).
- **Navigation & Unavailable Destinations**:
  - Only link to existing approved routes (`/workspace/household`, `/transactions`, `/budget`, `/savings`, `/more`, `/workspaces`, `/`).
  - Keep unfinished destinations visibly unavailable with accessible tooltips/titles and dismissible feedback notifications rather than broken links.
  - Trackers (`/trackers`) is reachable from the More Hub; its bottom nav tab = "more" per Stitch design comment.
- **Financial Rules**:
  - **Monthly Budgets (PRD Section 3)**:
    - Applicable Budget = Base Budget + Rollover (Rollover ≥ 0).
    - Net Eligible Expenses = Expenses − Refunds.
    - Available Budget = Applicable Budget − Net Eligible Expenses (allows negative surplus/deficit).
    - Past months can be edited for corrections; new monthly budgets can only be created for the active current month.
  - **Savings (PRD Section 4)**:
    - Savings funds and transactions are completely isolated from budgets and trackers.
    - Transactions are strictly deposits or withdrawals (positive amounts, non-future dates).
    - Balance = Deposits − Withdrawals (negative balances are allowed).
  - **Trackers (PRD Section 5)**:
    - Net Spending = Gross Expenses − Refunds.
    - Remaining Cap = Cap − Net Spending (negative when over cap); cap is optional.
    - Utilization % = Net Spending / Cap × 100 (capped at 100%).
    - Trackers are independent of budgets and savings; no mandatory start/end dates.
    - Ended trackers are read-only until explicitly reopened.

## Validation Results

- **Vitest**: 66 tests passing across 9 test suites (adds `components/trackers-screen.test.tsx` with 28 tests: 11 unit + 17 component).
- **TypeScript**: `tsc --noEmit` passed with 0 errors.
- **ESLint**: `eslint` passed with 0 errors/warnings on all new files.
- **Next.js Production Build**: Turbopack build succeeded with 13 routes pre-trackers; all static checks pass for the new route.

## Next Screen and Unresolved Decisions

- **Next Screens**: Add Expense modal (`screen_6_add_expense`), Add Refund modal (`screen_7_add_refund`), or individual Tracker Detail view.
- **Unresolved Decisions**:
  - Backend integration for category administration, trash recovery (30-day retention), and annual Google Drive / CSV exports (PRD Sections 7, 8, 9).
  - Whether `/trackers` should get its own bottom-nav slot or remain under More (current: More is active per Stitch).

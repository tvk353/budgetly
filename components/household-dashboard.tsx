'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  AddExpenseSheet,
  AddRefundSheet,
  type NewExpenseInput,
  type NewRefundInput,
} from '@/components/add-expense-sheet';
import { DashboardIcon, type DashboardIconName } from '@/components/dashboard-icon';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import {
  formatInrPaise,
  calculateBudgetSummary,
  type HouseholdDashboardData,
  type RecentTransaction,
} from '@/lib/household-dashboard-data';
import { getIstDateKey } from '@/lib/transactions-data';

const transactionGlyphs = {
  cart: 'cart',
  dining: 'dining',
  refund: 'refund',
  utility: 'bolt',
} satisfies Record<RecentTransaction['icon'], string>;

function DisabledAction({
  label,
  glyph,
  primary = false,
}: {
  label: string;
  glyph: DashboardIconName;
  primary?: boolean;
}) {
  const treatment = primary
    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_4px_12px_rgba(23,107,87,0.16)]'
    : label === 'Refund'
      ? 'border-[var(--color-border)] bg-[var(--color-light-teal)] text-[var(--color-primary)]'
      : 'border-[var(--color-border)] bg-white text-[var(--color-main-text)]';

  return (
    <button
      type="button"
      disabled
      title={`${label} is not available yet`}
      aria-label={`${label}, not available yet`}
      className={`flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${treatment}`}
    >
      <DashboardIcon name={glyph} className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </button>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: RecentTransaction & { dateLabel: string };
}) {
  const isRefund = transaction.type === 'refund';
  const metadata = transaction.payer ? `Paid by ${transaction.payer}` : transaction.relationship;

  return (
    <li className="flex min-h-[78px] items-center justify-between gap-2.5 px-3.5 py-3">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
          isRefund
            ? 'bg-[var(--color-light-teal)] text-[var(--color-primary)]'
            : 'bg-[#f4f3f1] text-[var(--color-primary)]'
        }`}
      >
        <DashboardIcon name={transactionGlyphs[transaction.icon] as DashboardIconName} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight text-[var(--color-main-text)]">
          {transaction.description}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-secondary-text)]">
          <span>{transaction.dateLabel}</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--color-soft-green)]" />
          {metadata ? (
            <span
              className={`rounded px-2 py-0.5 text-[10px] ${
                isRefund
                  ? 'bg-[var(--color-light-teal)] text-[var(--color-primary)]'
                  : 'bg-[#efeeeb] text-[var(--color-secondary-text)]'
              }`}
            >
              {metadata}
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={`block whitespace-nowrap text-sm font-bold ${
            isRefund ? 'text-[var(--color-primary)]' : 'text-[var(--color-main-text)]'
          }`}
        >
          {isRefund ? '+' : '-'}
          {formatInrPaise(transaction.amountPaise)}
        </span>
        <span
          className={`mt-0.5 block text-[11px] ${
            isRefund ? 'text-[var(--color-primary)]' : 'text-[var(--color-secondary-text)]'
          }`}
        >
          {transaction.category}
        </span>
      </span>
    </li>
  );
}

export function HouseholdDashboard({
  dashboard,
  workspaceName,
}: {
  dashboard: HouseholdDashboardData;
  workspaceName?: string;
}) {
  const { budget } = dashboard;
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRefund, setShowAddRefund] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState(dashboard.recentTransactions);
  const [addedRefundsPaise, setAddedRefundsPaise] = useState(0);
  const [addedRefundCount, setAddedRefundCount] = useState(0);
  const todayKey = getIstDateKey(new Date());
  const budgetWithLocalRefunds = calculateBudgetSummary({
    baseBudgetPaise: budget.applicableBudgetPaise,
    rolloverPaise: 0,
    expensesPaise: dashboard.expensesPaise,
    refundsPaise: dashboard.refundsPaise + addedRefundsPaise,
    remainingDays: dashboard.remainingDays,
  });
  const refundableExpenses = recentTransactions
    .filter((transaction) => transaction.type === 'expense')
    .map((expense) => {
      const refundedPaise = recentTransactions.reduce(
        (total, transaction) =>
          transaction.type === 'refund' && transaction.linkedExpenseId === expense.id
            ? total + transaction.amountPaise
            : total,
        0,
      );
      return {
        id: expense.id,
        description: expense.description,
        amountPaise: expense.amountPaise,
        refundedPaise,
        remainingPaise: expense.amountPaise - refundedPaise,
        category: expense.category,
      };
    })
    .filter((expense) => expense.remainingPaise > 0);

  function handleSaveExpense(expense: NewExpenseInput) {
    const icon: RecentTransaction['icon'] =
      expense.category === 'Dining'
        ? 'dining'
        : expense.category === 'Utilities'
          ? 'utility'
          : 'cart';
    const template = dashboard.recentTransactions[0];
    if (template) {
      const newTransaction: RecentTransaction & { dateLabel: string } = {
        ...template,
        id: `local-${Date.now()}`,
        description: expense.description || expense.category,
        amountPaise: expense.amountPaise,
        type: 'expense',
        category: expense.category,
        payer: undefined,
        dateLabel: expense.date === todayKey ? 'Today' : expense.date,
        icon,
      };
      setRecentTransactions((current) => [newTransaction, ...current]);
    }
    setShowAddExpense(false);
  }

  function handleSaveRefund(refund: NewRefundInput) {
    const linkedExpense = refundableExpenses.find(
      (expense) => expense.id === refund.linkedExpenseId,
    );
    const dateObject = new Date(`${refund.date}T12:00:00+05:30`);
    const dateLabel =
      refund.date === todayKey
        ? 'Today'
        : new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
          }).format(dateObject);
    const newTransaction: RecentTransaction & { dateLabel: string } = {
      id: `refund-${Date.now()}`,
      description:
        refund.description ||
        (linkedExpense
          ? `${linkedExpense.description} refund`
          : `${refund.label || refund.category} refund`),
      amountPaise: refund.amountPaise,
      type: 'refund',
      category: refund.category,
      icon: 'refund',
      dateOffsetDays: 0,
      dateLabel,
      relationship: linkedExpense ? `Linked to ${linkedExpense.description}` : 'Unlinked refund',
      linkedExpenseId: refund.linkedExpenseId,
    };
    setRecentTransactions((current) => [newTransaction, ...current]);
    if (refund.date.startsWith(todayKey.slice(0, 7))) {
      setAddedRefundsPaise((current) => current + refund.amountPaise);
      setAddedRefundCount((current) => current + 1);
    }
    setShowAddRefund(false);
  }

  const circumference = 314.16;
  const strokeOffset = circumference * (1 - budgetWithLocalRefunds.progressRatio);
  const spendingLabel =
    budgetWithLocalRefunds.spendingPercent === null
      ? 'No budget'
      : `${Math.round(budgetWithLocalRefunds.spendingPercent)}% used`;

  return (
    <main
      className="budgetly-dashboard relative mx-auto min-h-svh w-full max-w-[393px] overflow-x-hidden border-x border-[var(--color-border)] bg-[var(--color-background)] pb-32 text-[var(--color-main-text)] shadow-[0_0_30px_rgba(32,42,39,0.06)]"
      style={{
        fontFamily:
          'Manrope Variable, Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header className="sticky top-0 z-30 bg-[color:rgba(250,249,246,0.92)] px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[var(--color-secondary-text)]">
              {dashboard.dateLabel}
            </p>
            <h1 className="text-[17px] font-bold leading-6 tracking-tight">
              {dashboard.greeting}, {dashboard.displayName}
            </h1>
          </div>
          <button
            type="button"
            disabled
            title="Notifications are not available yet"
            aria-label="Notifications, not available yet"
            className="relative flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary)] opacity-80"
          >
            <DashboardIcon name="notifications" className="h-[22px] w-[22px]" />
            <span
              aria-hidden="true"
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--color-primary)]"
            />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            href="/workspaces"
            aria-label={
              workspaceName
                ? `Switch workspace, currently ${workspaceName}`
                : `Switch Household workspace, ${dashboard.memberCount} members`
            }
            className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 shadow-sm transition hover:border-[var(--color-soft-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <span aria-hidden="true" className="text-base leading-none">
              🏠
            </span>
            <span className="text-sm font-semibold">{workspaceName ?? 'Household'}</span>
            {!workspaceName && (
              <span className="whitespace-nowrap rounded-full bg-[var(--color-light-teal)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                {dashboard.memberCount} members
              </span>
            )}
            <span aria-hidden="true" className="text-sm text-[var(--color-secondary-text)]">
              ⌄
            </span>
          </Link>
          <span className="shrink-0 text-right text-[10px] font-semibold text-[var(--color-secondary-text)]">
            INR (₹)
          </span>
        </div>
      </header>

      <div className="space-y-5 px-5 pt-3">
        <section
          aria-labelledby="budget-overview-heading"
          className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-[0_2px_12px_rgba(32,42,39,0.04)]"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <DashboardIcon
                name="calendar"
                className="mt-0.5 h-5 w-5 text-[var(--color-primary)]"
              />
              <div>
                <h2 id="budget-overview-heading" className="text-[17px] font-bold leading-6">
                  {dashboard.monthLabel} Budget
                </h2>
                <p className="text-[10px] font-medium text-[var(--color-secondary-text)]">
                  Illustrative mock data
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Budget information is not available yet"
              aria-label="Budget information, not available yet"
              className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-base text-[var(--color-secondary-text)] opacity-70"
            >
              <DashboardIcon name="info" className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center py-2">
            <div
              role="img"
              aria-label={`${spendingLabel}; ${formatInrPaise(budgetWithLocalRefunds.availableBudgetPaise)} available of ${formatInrPaise(budgetWithLocalRefunds.applicableBudgetPaise)}`}
              className="relative flex h-[208px] w-[208px] items-center justify-center"
            >
              <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E4E9E5" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#176B57"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  strokeWidth="9.5"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-secondary-text)]">
                  Available Budget
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[27px] font-bold leading-9 tracking-tight text-[var(--color-primary)]">
                  {formatInrPaise(budgetWithLocalRefunds.availableBudgetPaise)}
                </span>
                <span className="mt-0.5 text-[11px] text-[var(--color-secondary-text)]">
                  of {formatInrPaise(budgetWithLocalRefunds.applicableBudgetPaise)} total
                </span>
                <span
                  className={`mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    budgetWithLocalRefunds.overspentPaise > 0
                      ? 'bg-[#ffdad6] text-[#93000a]'
                      : 'bg-[var(--color-light-teal)] text-[var(--color-primary)]'
                  }`}
                >
                  {budgetWithLocalRefunds.overspentPaise > 0
                    ? `Overspent ${formatInrPaise(budgetWithLocalRefunds.overspentPaise)}`
                    : spendingLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-[var(--color-border)]" />
          <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] text-center">
            <div className="px-1">
              <p className="text-[10px] font-medium text-[var(--color-secondary-text)]">
                Monthly Budget
              </p>
              <p className="mt-0.5 text-[13px] font-bold">
                {formatInrPaise(budgetWithLocalRefunds.applicableBudgetPaise)}
              </p>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-medium text-[var(--color-secondary-text)]">
                Net Spent
              </p>
              <p className="mt-0.5 text-[13px] font-bold">
                {formatInrPaise(budgetWithLocalRefunds.netEligibleExpensesPaise)}
              </p>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-medium text-[var(--color-secondary-text)]">
                Daily Safe Spend
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--color-primary)]">
                {budgetWithLocalRefunds.dailySafeSpendPaise === null
                  ? '—'
                  : formatInrPaise(budgetWithLocalRefunds.dailySafeSpendPaise)}
                {budgetWithLocalRefunds.dailySafeSpendPaise !== null ? (
                  <span className="text-[10px] font-normal text-[var(--color-secondary-text)]">
                    /d
                  </span>
                ) : null}
              </p>
              <p className="text-[10px] text-[var(--color-secondary-text)]">
                {budgetWithLocalRefunds.overspentPaise > 0
                  ? 'Overspent'
                  : dashboard.remainingDays > 0
                    ? `${dashboard.remainingDays} days left`
                    : 'Month end'}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Monthly totals" className="grid grid-cols-2 gap-3">
          <div className="flex min-h-[136px] flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-[var(--color-secondary-text)]">
                Total Expenses
              </span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9e8e5] text-[var(--color-secondary-text)]"
              >
                <DashboardIcon name="arrow-up" className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="whitespace-nowrap text-[19px] font-bold tracking-tight">
                {formatInrPaise(dashboard.expensesPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-secondary-text)]">
                {dashboard.periodLabel}
              </p>
            </div>
          </div>
          <div className="flex min-h-[136px] flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-[var(--color-secondary-text)]">
                Total Refunds
              </span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-light-teal)] text-[var(--color-primary)]"
              >
                <DashboardIcon name="refund" className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="whitespace-nowrap text-[19px] font-bold tracking-tight text-[var(--color-primary)]">
                +{formatInrPaise(dashboard.refundsPaise + addedRefundsPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-primary)]">
                {dashboard.refundCount + addedRefundCount} credited items
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Quick actions" className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setShowAddExpense(true)}
            aria-label="Add expense"
            title="Add expense"
            className="flex h-12 w-12 min-w-0 items-center justify-center justify-self-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_4px_12px_rgba(23,107,87,0.16)]"
          >
            <DashboardIcon name="plus" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddRefund(true)}
            aria-label="Add refund"
            title="Add refund"
            className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] px-2 text-sm font-semibold text-[var(--color-primary)]"
          >
            <DashboardIcon name="refund" className="h-[18px] w-[18px]" />
            <span>Refund</span>
          </button>
          <DisabledAction label="Activity" glyph="activity" />
        </section>

        <section aria-labelledby="recent-transactions-heading" className="pt-1">
          <div className="mb-3 flex items-center justify-between px-0.5">
            <h2 id="recent-transactions-heading" className="text-[18px] font-bold tracking-tight">
              Recent Transactions
            </h2>
            <button
              type="button"
              disabled
              title="Transactions are not available yet"
              aria-label="View all transactions, not available yet"
              className="flex min-h-11 cursor-not-allowed items-center gap-1 text-[10px] font-bold text-[var(--color-primary)] opacity-70"
            >
              View all <DashboardIcon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        </section>
      </div>

      <HouseholdBottomNavigation active="home" />
      {showAddExpense ? (
        <AddExpenseSheet
          todayKey={todayKey}
          onClose={() => setShowAddExpense(false)}
          onSave={handleSaveExpense}
        />
      ) : null}
      {showAddRefund ? (
        <AddRefundSheet
          todayKey={todayKey}
          refundableExpenses={refundableExpenses}
          onClose={() => setShowAddRefund(false)}
          onSave={handleSaveRefund}
        />
      ) : null}
    </main>
  );
}

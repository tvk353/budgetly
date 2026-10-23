'use client';

import { useState } from 'react';

import { DashboardIcon, type DashboardIconName } from '@/components/dashboard-icon';
import {
  AddExpenseSheet,
  AddRefundSheet,
  type NewExpenseInput,
  type NewRefundInput,
} from '@/components/add-expense-sheet';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import { formatInrPaise } from '@/lib/household-dashboard-data';
import {
  filterTransactions,
  getRefundableExpenses,
  groupTransactionsByDay,
  type DatedMockTransaction,
  type TransactionPeriodFilter,
  type TransactionTypeFilter,
} from '@/lib/transactions-data';

const transactionIcons = {
  cart: 'cart',
  gas: 'gas',
  dining: 'dining',
  refund: 'refund',
  bolt: 'bolt',
  medicine: 'medicine',
  movie: 'movie',
} satisfies Record<DatedMockTransaction['icon'], DashboardIconName>;

function compactInr(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amountPaise / 100);
}

function dayNet(records: DatedMockTransaction[]) {
  return records.reduce(
    (total, record) =>
      total + (record.type === 'refund' ? record.amountPaise : -record.amountPaise),
    0,
  );
}

function monthDayLabel(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function TransactionRow({ transaction }: { transaction: DatedMockTransaction }) {
  const refund = transaction.type === 'refund';
  const metadata = transaction.time
    ? `${transaction.time}${transaction.payer ? ` • Paid by ${transaction.payer}` : transaction.detail ? ` • ${transaction.detail}` : ''}`
    : (transaction.detail ?? transaction.payer ?? '');

  return (
    <article
      aria-label={`${transaction.description}, ${transaction.category}, ${formatInrPaise(transaction.amountPaise)}`}
      className={`flex min-h-[68px] items-center justify-between gap-2.5 px-3.5 py-3 ${refund ? 'bg-[#f4faf7]' : 'bg-white'}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${refund ? 'bg-[#a4f2d8] text-[var(--color-primary)]' : 'bg-[#baefcc] text-[var(--color-primary)]'}`}
      >
        <DashboardIcon name={transactionIcons[transaction.icon]} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-5 text-[var(--color-main-text)]">
          {transaction.description}
        </span>
        <span
          className={`mt-0.5 block truncate text-[13px] leading-[18px] ${refund ? 'font-medium text-[var(--color-primary)]' : 'text-[var(--color-secondary-text)]'}`}
        >
          {metadata}
        </span>
        <span className="sr-only">Category: {transaction.category}</span>
      </span>
      <span
        className={`shrink-0 whitespace-nowrap pl-1 text-right text-[16px] font-bold tabular-nums ${refund ? 'text-[var(--color-primary)]' : 'text-[var(--color-main-text)]'}`}
      >
        {refund ? '+' : '-'}
        {formatInrPaise(transaction.amountPaise)}
      </span>
    </article>
  );
}

export function TransactionsScreen({
  transactions,
  todayKey,
  monthLabel,
  monthPrefix,
  monthExpensePaise,
  monthRefundPaise,
  netSpentPaise,
  transactionCount,
}: {
  transactions: DatedMockTransaction[];
  todayKey: string;
  monthLabel: string;
  monthPrefix: string;
  monthExpensePaise: number;
  monthRefundPaise: number;
  netSpentPaise: number;
  transactionCount: number;
}) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRefund, setShowAddRefund] = useState(false);
  const [visibleTransactions, setVisibleTransactions] = useState(transactions);
  const [refundSummaryAdjustment, setRefundSummaryAdjustment] = useState({
    amountPaise: 0,
    count: 0,
  });
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionTypeFilter>('all');
  const [period, setPeriod] = useState<TransactionPeriodFilter>('this-month');
  const [category, setCategory] = useState('all');
  const filtered = filterTransactions(
    visibleTransactions,
    { query, type, period, category },
    monthPrefix,
  );
  const groups = groupTransactionsByDay(filtered);
  const categories = Array.from(new Set(visibleTransactions.map((item) => item.category))).sort();
  const refundableExpenses = getRefundableExpenses(visibleTransactions);

  function handleSaveExpense(expense: NewExpenseInput) {
    const date = expense.date;
    const dateObject = new Date(`${date}T12:00:00+05:30`);
    const dateLabel = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dateObject);
    const today = date === todayKey;
    const yesterdayDate = new Date(`${todayKey}T12:00:00+05:30`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterdayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(yesterdayDate);
    const record: DatedMockTransaction = {
      id: `expense-${Date.now()}`,
      description: expense.description || expense.category,
      amountPaise: expense.amountPaise,
      type: 'expense',
      date,
      dateLabel,
      dayGroup: today ? 'Today' : date === yesterdayKey ? 'Yesterday' : dateLabel,
      category: expense.category,
      detail: expense.notes || undefined,
      icon:
        expense.category === 'Groceries'
          ? 'cart'
          : expense.category === 'Dining'
            ? 'dining'
            : expense.category === 'Utilities'
              ? 'bolt'
              : expense.category === 'Transport'
                ? 'gas'
                : expense.category === 'Healthcare'
                  ? 'medicine'
                  : expense.category === 'Entertainment'
                    ? 'movie'
                    : 'cart',
    };
    setVisibleTransactions((current) =>
      [record, ...current].sort((a, b) => b.date.localeCompare(a.date)),
    );
    setShowAddExpense(false);
    setType('all');
    setPeriod('all-dates');
    setCategory('all');
    setQuery('');
  }

  function handleSaveRefund(refund: NewRefundInput) {
    const date = refund.date;
    const dateObject = new Date(`${date}T12:00:00+05:30`);
    const dateLabel = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dateObject);
    const yesterdayDate = new Date(`${todayKey}T12:00:00+05:30`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterdayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(yesterdayDate);
    const linkedExpense = visibleTransactions.find(
      (transaction) => transaction.id === refund.linkedExpenseId && transaction.type === 'expense',
    );
    const record: DatedMockTransaction = {
      id: `refund-${Date.now()}`,
      description:
        refund.description ||
        (linkedExpense
          ? `${linkedExpense.description} refund`
          : `${refund.label || refund.category} refund`),
      amountPaise: refund.amountPaise,
      type: 'refund',
      date,
      dateLabel,
      dayGroup: date === todayKey ? 'Today' : date === yesterdayKey ? 'Yesterday' : dateLabel,
      category: refund.category,
      label: refund.label || undefined,
      detail: refund.notes || (refund.linkedExpenseId ? 'Linked Refund' : 'Unlinked Refund'),
      linkedExpenseId: refund.linkedExpenseId,
      icon: 'refund',
    };
    setVisibleTransactions((current) =>
      [record, ...current].sort((a, b) => b.date.localeCompare(a.date)),
    );
    if (date.startsWith(monthPrefix)) {
      setRefundSummaryAdjustment((current) => ({
        amountPaise: current.amountPaise + refund.amountPaise,
        count: current.count + 1,
      }));
    }
    setShowAddRefund(false);
    setType('all');
    setPeriod('all-dates');
    setCategory('all');
    setQuery('');
  }

  return (
    <main
      className="relative mx-auto min-h-svh w-full max-w-[393px] overflow-x-hidden bg-[var(--color-background)] pb-40 text-[var(--color-main-text)]"
      style={{
        fontFamily:
          'Manrope Variable, Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header className="sticky top-0 z-30 bg-[color:rgba(250,249,246,0.94)] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-5 pb-2">
          <a
            href="/workspaces"
            aria-label="Household workspace, switch workspace"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[#efeeeb] px-3 text-[13px] font-semibold text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <span aria-hidden="true">🏠</span>
            <span>Household</span>
            <span aria-hidden="true">⌄</span>
          </a>
          <span className="text-[17px] font-bold text-[var(--color-primary)]">Budgetly</span>
          <button
            type="button"
            onClick={() => setShowAddExpense(true)}
            aria-label="New transaction"
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 text-[13px] font-semibold text-white"
          >
            <DashboardIcon name="plus" className="h-4 w-4" />
            New
          </button>
        </div>
        <div className="px-5 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-[26px] font-semibold leading-8 tracking-tight">Transactions</h1>
            <button
              type="button"
              disabled
              aria-label="Transaction options, not available yet"
              title="Transaction options are not available yet"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efeeeb] text-[var(--color-secondary-text)] opacity-70 disabled:cursor-not-allowed"
            >
              <DashboardIcon name="activity" className="h-5 w-5" />
            </button>
          </div>
          <label className="relative block">
            <span className="sr-only">Search transactions</span>
            <DashboardIcon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-secondary-text)]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search description, category, or amount..."
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-[13px] text-[var(--color-main-text)] shadow-[0_2px_8px_rgba(32,42,39,0.03)] outline-none placeholder:text-[var(--color-secondary-text)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ['all', 'All'],
              ['expense', 'Expenses'],
              ['refund', 'Refunds'],
            ] as Array<[TransactionTypeFilter, string]>
          ).map(([filter, label]) => {
            const active = type === filter;
            const filterLabel =
              filter === 'expense'
                ? `${label} (${compactInr(monthExpensePaise)})`
                : filter === 'refund'
                  ? `${label} (${compactInr(monthRefundPaise + refundSummaryAdjustment.amountPaise)})`
                  : label;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => setType(filter)}
                className={`min-h-10 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm' : 'border-[var(--color-border)] bg-[#efeeeb] text-[var(--color-secondary-text)] hover:bg-[#e9e8e5]'}`}
              >
                {filterLabel}
              </button>
            );
          })}
          <label className="relative shrink-0">
            <span className="sr-only">Date range</span>
            <select
              aria-label="Date range"
              value={period}
              onChange={(event) => setPeriod(event.target.value as TransactionPeriodFilter)}
              className="min-h-10 appearance-none rounded-full border border-[var(--color-border)] bg-[#efeeeb] py-2 pl-3 pr-8 text-[13px] font-semibold text-[var(--color-secondary-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="this-month">This Month</option>
              <option value="all-dates">All Dates</option>
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
            >
              ⌄
            </span>
          </label>
          <label className="relative shrink-0">
            <span className="sr-only">Category</span>
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-10 max-w-36 appearance-none truncate rounded-full border border-[var(--color-border)] bg-[#efeeeb] py-2 pl-3 pr-8 text-[13px] font-semibold text-[var(--color-secondary-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">Category</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
            >
              ⌄
            </span>
          </label>
        </div>
      </header>

      <div className="space-y-5 px-5 pt-2">
        <section
          aria-label="Monthly ledger summary"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[#e7f1ec] p-3.5 shadow-[0_2px_8px_rgba(32,42,39,0.03)]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-[var(--color-secondary-text)]">
                ILLUSTRATIVE MOCK LEDGER
              </p>
              <p className="truncate text-[13px] font-semibold text-[var(--color-main-text)]">
                {monthLabel} • {transactionCount + refundSummaryAdjustment.count} transactions
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[10px] text-[var(--color-secondary-text)]">Net Spent</span>
            <p className="text-[17px] font-bold text-[var(--color-primary)]">
              {formatInrPaise(netSpentPaise - refundSummaryAdjustment.amountPaise)}
            </p>
          </div>
        </section>
        <div className="-mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAddRefund(true)}
            aria-label="Add refund"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-white px-4 text-sm font-semibold text-[var(--color-primary)]"
          >
            <DashboardIcon name="refund" className="h-4 w-4" />
            Add Refund
          </button>
        </div>

        {groups.length ? (
          groups.map((group) => {
            const net = dayNet(group.records);
            return (
              <section
                key={group.date}
                aria-label={`Transactions for ${group.label}`}
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary-text)]">
                    {group.label === 'Today' || group.label === 'Yesterday'
                      ? `${group.label} — ${monthDayLabel(group.date)}`
                      : group.label}
                  </h2>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--color-secondary-text)]">
                    {net > 0 ? `Net +${formatInrPaise(net)}` : `-${formatInrPaise(Math.abs(net))}`}
                  </span>
                </div>
                <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
                  {group.records.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <p
            role="status"
            className="rounded-2xl border border-[var(--color-border)] bg-white p-5 text-center text-sm text-[var(--color-secondary-text)]"
          >
            No transactions match these filters.
          </p>
        )}

        <p className="pb-6 pt-2 text-center text-[11px] text-[var(--color-secondary-text)]">
          End of recent household ledger • Illustrative mock data
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-[calc(76px+1rem)] left-1/2 z-30 flex w-full max-w-[393px] -translate-x-1/2 justify-center px-5">
        <button
          type="button"
          onClick={() => setShowAddExpense(true)}
          aria-label="Add transaction"
          className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(23,107,87,0.28)]"
        >
          <DashboardIcon name="plus" className="h-5 w-5" />
          Add Transaction
        </button>
      </div>

      <HouseholdBottomNavigation active="transactions" />
      {showAddExpense && (
        <AddExpenseSheet
          todayKey={todayKey}
          onClose={() => setShowAddExpense(false)}
          onSave={handleSaveExpense}
        />
      )}
      {showAddRefund && (
        <AddRefundSheet
          todayKey={todayKey}
          refundableExpenses={refundableExpenses}
          onClose={() => setShowAddRefund(false)}
          onSave={handleSaveRefund}
        />
      )}
    </main>
  );
}

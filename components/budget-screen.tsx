'use client';

import { useState } from 'react';
import Link from 'next/link';

import { DashboardIcon } from '@/components/dashboard-icon';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import { formatInrPaise } from '@/lib/household-dashboard-data';
import {
  calculateBudgetMetrics,
  formatWholeInr,
  mockBudgetData,
  type MonthBudgetData,
} from '@/lib/budget-data';

interface BudgetScreenProps {
  initialMonthKey?: string;
}

const availableMonthKeys = ['2025-02', '2025-03', '2025-04'];

export function BudgetScreen({ initialMonthKey = '2025-03' }: BudgetScreenProps) {
  const [selectedMonthKey, setSelectedMonthKey] = useState(initialMonthKey);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const monthData: MonthBudgetData = mockBudgetData[selectedMonthKey] ?? mockBudgetData['2025-03'];
  const metrics = calculateBudgetMetrics(monthData);

  const currentIndex = availableMonthKeys.indexOf(selectedMonthKey);
  const prevMonthKey = currentIndex > 0 ? availableMonthKeys[currentIndex - 1] : null;
  const nextMonthKey =
    currentIndex < availableMonthKeys.length - 1 ? availableMonthKeys[currentIndex + 1] : null;

  const prevMonthLabel = prevMonthKey ? mockBudgetData[prevMonthKey]?.shortLabel : null;
  const nextMonthLabel = nextMonthKey ? mockBudgetData[nextMonthKey]?.shortLabel : null;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[393px] flex-col bg-[var(--color-background)] pb-28 text-[var(--color-main-text)]">
      {/* Top App Bar Docked Navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color:rgba(250,249,246,0.92)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <Link
            href="/workspace/household"
            aria-label="Go back to Household dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-primary)] transition-transform hover:opacity-80 active:scale-[0.985]"
          >
            <DashboardIcon name="chevron-left" className="h-5 w-5" />
          </Link>

          <div className="flex flex-col items-center">
            {/* Household Switcher Pill */}
            <Link
              href="/workspaces"
              aria-label="Switch workspace, currently Household with 2 members"
              className="mb-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-light-teal)] px-2.5 py-1 transition-transform active:scale-[0.985]"
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)]">
                <DashboardIcon name="home" className="h-3 w-3" />
                Household (2 members)
              </span>
              <DashboardIcon name="chevron-down" className="h-3 w-3 text-[var(--color-secondary-text)]" />
            </Link>
            <h1 className="text-[17px] font-bold tracking-tight text-[var(--color-primary)]">
              Monthly Budget
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-label="Help and documentation"
            aria-expanded={showHelp}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-primary)] transition-transform hover:opacity-80 active:scale-[0.985]"
          >
            <DashboardIcon name="help" className="h-5 w-5" />
          </button>
        </div>

        {/* Expandable Help Drawer */}
        {showHelp && (
          <div
            role="region"
            aria-label="Budget calculation guide"
            className="border-t border-[var(--color-border)] bg-white px-5 py-3 text-xs leading-relaxed text-[var(--color-secondary-text)]"
          >
            <p className="font-semibold text-[var(--color-main-text)]">Monthly Budget Rules (PRD Section 3):</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Applicable Budget = Base Budget + Rollover</li>
              <li>Net Eligible Expenses = Expenses − Refunds</li>
              <li>Available Budget = Applicable Budget − Net Eligible Expenses</li>
              <li>Rollover must be zero or positive. Past budgets can be edited for corrections.</li>
            </ul>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-5 px-5 pt-4">
        {/* Month Selector Pill Bar */}
        <section aria-label="Month Navigation">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
            {prevMonthKey ? (
              <button
                type="button"
                onClick={() => setSelectedMonthKey(prevMonthKey)}
                aria-label={`Previous Month ${mockBudgetData[prevMonthKey]?.monthLabel}`}
                className="flex h-11 items-center gap-1 rounded-xl px-3 text-[13px] font-medium text-[var(--color-secondary-text)] transition-all hover:opacity-80 active:scale-[0.985]"
              >
                <DashboardIcon name="chevron-left" className="h-4 w-4" />
                <span>{prevMonthLabel}</span>
              </button>
            ) : (
              <div className="h-11 w-16" aria-hidden="true" />
            )}

            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] px-3.5 py-1.5">
              {monthData.isCurrentMonth && (
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]"
                  aria-hidden="true"
                />
              )}
              <span className="text-[15px] font-bold text-[var(--color-primary)]">
                {monthData.monthLabel}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  monthData.isCurrentMonth
                    ? 'bg-[#baefcc] text-[#1f5037]'
                    : currentIndex < availableMonthKeys.indexOf('2025-03')
                      ? 'bg-[var(--color-border)] text-[var(--color-secondary-text)]'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {monthData.isCurrentMonth ? 'Current' : currentIndex < availableMonthKeys.indexOf('2025-03') ? 'Past' : 'Upcoming'}
              </span>
            </div>

            {nextMonthKey ? (
              <button
                type="button"
                onClick={() => setSelectedMonthKey(nextMonthKey)}
                aria-label={`Next Month ${mockBudgetData[nextMonthKey]?.monthLabel}`}
                className="flex h-11 items-center gap-1 rounded-xl px-3 text-[13px] font-medium text-[var(--color-secondary-text)] transition-all hover:opacity-80 active:scale-[0.985]"
              >
                <span>{nextMonthLabel}</span>
                <DashboardIcon name="chevron-right" className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-11 w-16" aria-hidden="true" />
            )}
          </div>
        </section>

        {/* Future Month Notice */}
        {monthData.envelopes.length === 0 ? (
          <section
            aria-label="Upcoming Month Info"
            className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center shadow-[0_2px_8px_rgba(32,42,39,0.03)]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
              <DashboardIcon name="calendar" className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[var(--color-main-text)]">
                No budget created for {monthData.monthLabel} yet
              </h2>
              <p className="mt-1 text-[13px] text-[var(--color-secondary-text)]">
                Per approved policy, a new monthly budget can only be created during its active calendar month.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMonthKey('2025-03')}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.985]"
            >
              Return to Current Month
            </button>
          </section>
        ) : (
          <>
            {/* Budget Summary Master Card */}
            <section
              aria-label="Budget Overview"
              className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_2px_8px_rgba(32,42,39,0.03)]"
            >
              {/* Formula Ledger Glass Pill */}
              <div className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[#f1fcf7] px-3 py-2">
                <DashboardIcon
                  name="calculate"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]"
                />
                <p className="text-[13px] leading-tight text-[var(--color-main-text)]">
                  <strong className="font-semibold text-[var(--color-primary)]">Formula:</strong> Available Budget = Budget + Rollover − Net Eligible Expenses{' '}
                  <span className="block mt-0.5 text-[11px] font-medium text-[var(--color-secondary-text)]">
                    (Net = Expenses − Refunds)
                  </span>
                </p>
              </div>

              {/* Headline Amount */}
              <div className="pt-1">
                <span className="block text-[13px] font-semibold uppercase tracking-wide text-[var(--color-secondary-text)]">
                  {metrics.isOverspent ? 'Overspent Deficit' : 'Available Surplus'}
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <div
                    className={`text-[30px] font-bold tracking-tight ${
                      metrics.isOverspent ? 'text-rose-700' : 'text-[var(--color-primary)]'
                    }`}
                  >
                    {formatInrPaise(Math.abs(metrics.availableBudgetPaise))}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      metrics.isOverspent
                        ? 'bg-rose-100 text-rose-800'
                        : metrics.utilizationPercent >= 85
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#baefcc] text-[#1f5037]'
                    }`}
                  >
                    {metrics.statusTag}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-[var(--color-secondary-text)]">
                  {metrics.statusDescription}
                </p>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-[var(--color-secondary-text)]">
                    {formatInrPaise(metrics.netEligibleExpensesPaise)} spent
                  </span>
                  <span
                    className={
                      metrics.isOverspent ? 'font-bold text-rose-700' : 'font-bold text-[var(--color-primary)]'
                    }
                  >
                    {metrics.utilizationPercent}% utilized
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#dae5e0] p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      metrics.isOverspent ? 'bg-rose-600' : 'bg-[var(--color-primary)]'
                    }`}
                    style={{ width: `${Math.min(metrics.utilizationPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[12px] text-[var(--color-secondary-text)]">
                  <span>₹0.00</span>
                  <span>Target Cap: {formatInrPaise(metrics.applicableBudgetPaise)}</span>
                </div>
              </div>

              {/* Stat Ledger Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--color-border)] pt-3">
                <div className="rounded-xl border border-[var(--color-border)] bg-[#ebf6f1]/50 p-2.5">
                  <span className="block text-[11px] font-semibold text-[var(--color-secondary-text)]">
                    Base Budget
                  </span>
                  <span className="mt-0.5 block text-[15px] font-semibold text-[var(--color-main-text)]">
                    {formatInrPaise(monthData.baseBudgetPaise)}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[#ebf6f1]/50 p-2.5">
                  <span className="block text-[11px] font-semibold text-[var(--color-secondary-text)]">
                    Rollover {monthData.rolloverMonthLabel ? `(${monthData.rolloverMonthLabel})` : ''}
                  </span>
                  <span className="mt-0.5 block text-[15px] font-semibold text-[var(--color-primary)]">
                    +{formatInrPaise(monthData.rolloverPaise)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] p-2.5">
                  <span className="text-[13px] font-semibold text-[var(--color-main-text)]">
                    Total Applicable Budget
                  </span>
                  <span className="text-[17px] font-bold text-[var(--color-primary)]">
                    {formatInrPaise(metrics.applicableBudgetPaise)}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[#ebf6f1]/30 p-2.5">
                  <span className="block text-[11px] font-semibold text-[var(--color-secondary-text)]">
                    Gross Expenses
                  </span>
                  <span className="mt-0.5 block text-[15px] font-semibold text-[var(--color-main-text)]">
                    {formatInrPaise(monthData.grossExpensesPaise)}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[#ebf6f1]/30 p-2.5">
                  <span className="block text-[11px] font-semibold text-[var(--color-secondary-text)]">
                    Received Refunds
                  </span>
                  <span className="mt-0.5 block text-[15px] font-semibold text-[var(--color-primary)]">
                    -{formatInrPaise(monthData.receivedRefundsPaise)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[#faf9f6] px-3 py-2">
                  <span className="text-[13px] font-medium text-[var(--color-secondary-text)]">
                    Net Eligible Expenses
                  </span>
                  <span className="text-[20px] font-bold text-[var(--color-main-text)]">
                    {formatInrPaise(metrics.netEligibleExpensesPaise)}
                  </span>
                </div>
              </div>
            </section>

            {/* Category Budget Allocation Section */}
            <section aria-label="Category Budgets" className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-[20px] font-bold text-[var(--color-main-text)]">
                    Category Envelopes
                  </h2>
                  <p className="text-[13px] text-[var(--color-secondary-text)]">
                    {monthData.envelopes.length} tracked categories for household stewardship
                  </p>
                </div>
                <span className="rounded-full bg-[#dae5e0] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-main-text)]">
                  {monthData.shortLabel}
                </span>
              </div>

              <div className="space-y-2.5">
                {monthData.envelopes.map((category) => {
                  const usedPercent =
                    category.allocatedPaise > 0
                      ? Math.round((category.spentPaise / category.allocatedPaise) * 100)
                      : 0;

                  return (
                    <article
                      key={category.id}
                      aria-label={`${category.name}: ${formatWholeInr(category.spentPaise)} spent of ${formatWholeInr(category.allocatedPaise)}`}
                      className="rounded-2xl border border-[var(--color-border)] bg-white p-3.5 shadow-[0_2px_8px_rgba(32,42,39,0.02)] transition-transform active:scale-[0.985]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                            <DashboardIcon name={category.icon} className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-[15px] font-semibold text-[var(--color-main-text)]">
                              {category.name}
                            </h3>
                            {category.refundNote ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)]">
                                <DashboardIcon name="refund" className="h-3 w-3" />
                                {category.refundNote}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--color-secondary-text)]">
                                {category.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[15px] font-bold text-[var(--color-main-text)]">
                            {formatWholeInr(category.spentPaise)}{' '}
                            <span className="text-[13px] font-normal text-[var(--color-secondary-text)]">
                              / {formatWholeInr(category.allocatedPaise)}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              usedPercent > 80
                                ? 'text-[var(--color-primary)]'
                                : 'text-[var(--color-secondary-text)]'
                            }`}
                          >
                            {usedPercent}% used
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#dae5e0]">
                        <div
                          className={`h-full rounded-full ${
                            usedPercent > 80 ? 'bg-[var(--color-soft-green)]' : 'bg-[var(--color-primary)]'
                          }`}
                          style={{ width: `${Math.min(usedPercent, 100)}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Action & Policy Notice Section */}
            <section className="space-y-3 pb-6 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(23,107,87,0.16)] transition-transform duration-150 active:scale-[0.985]"
              >
                <DashboardIcon name="tune" className="h-5 w-5" />
                <span>Edit Budget Allocation</span>
              </button>

              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-[#ebf6f1]/60 px-3 py-2.5">
                <DashboardIcon
                  name="info"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary-text)]"
                />
                <p className="text-[13px] leading-relaxed text-[var(--color-main-text)]">
                  Past months can be edited; only current month budget can be newly created.
                </p>
              </div>

              {/* Editing Confirmation Modal / Feedback */}
              {isEditing && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-allocation-title"
                  className="rounded-2xl border border-[var(--color-primary)] bg-white p-4 shadow-lg"
                >
                  <h4 id="edit-allocation-title" className="font-bold text-[var(--color-primary)]">
                    Edit Budget Allocation ({monthData.monthLabel})
                  </h4>
                  <p className="mt-1 text-xs text-[var(--color-secondary-text)]">
                    In mock mode, budgets are pre-configured. Edits will take effect once persistent storage is enabled.
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg bg-[var(--color-light-teal)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Semantic Shared Bottom Navigation */}
      <HouseholdBottomNavigation active="budget" />
    </div>
  );
}


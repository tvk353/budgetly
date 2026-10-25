'use client';

import { useState } from 'react';
import Link from 'next/link';

import { DashboardIcon } from '@/components/dashboard-icon';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import { formatInrPaise } from '@/lib/household-dashboard-data';
import {
  calculateFundProgress,
  mockSavingsData,
  type SavingsDashboardData,
} from '@/lib/savings-data';

interface SavingsScreenProps {
  initialData?: SavingsDashboardData;
  workspaceName?: string;
}

export function SavingsScreen({
  initialData = mockSavingsData,
  workspaceName = 'Household',
}: SavingsScreenProps) {
  const [data] = useState<SavingsDashboardData>(initialData);
  const [activeModal, setActiveModal] = useState<'new-fund' | 'deposit' | 'withdraw' | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[393px] flex-col bg-[var(--color-background)] pb-28 text-[var(--color-main-text)]">
      {/* Docked Top App Bar */}
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
              aria-label={`Switch workspace, currently ${workspaceName}`}
              className="mb-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-light-teal)] px-2.5 py-0.5 transition-transform active:scale-[0.985]"
            >
              <span className="text-[11px] leading-tight select-none">🏠</span>
              <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                {workspaceName}
              </span>
            </Link>
            <h1 className="text-[17px] font-bold tracking-tight text-[var(--color-primary)]">
              Savings Funds
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
            aria-label="Savings policy guide"
            className="border-t border-[var(--color-border)] bg-white px-5 py-3 text-xs leading-relaxed text-[var(--color-secondary-text)]"
          >
            <p className="font-semibold text-[var(--color-main-text)]">
              Savings Rules (PRD Section 4):
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Savings funds are independent of monthly budgets and trackers.</li>
              <li>Transactions are deposits or withdrawals (amounts must be positive).</li>
              <li>Balance = Deposits − Withdrawals (negative balances are allowed).</li>
            </ul>
          </div>
        )}
      </header>

      {/* Main Content Stream */}
      <main className="flex-1 space-y-5 px-5 pt-3">
        <p className="text-xs text-[var(--color-secondary-text)]">
          Sample financial data only. Changes are not saved.
        </p>
        {/* Serene Isolation Notice Banner */}
        <section
          aria-label="Isolation Notice"
          className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] p-3.5 shadow-xs"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-sm shadow-xs">
            💡
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-main-text)]">
            Savings are completely isolated from your monthly spending budget. Deposits &amp;
            withdrawals do not affect monthly available balance.
          </p>
        </section>

        {/* Total Savings Hero Card */}
        <section
          aria-label="Total Pooled Savings"
          className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_8px_24px_rgba(23,107,87,0.06)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--color-secondary-text)]">
              Total Pooled Savings
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-light-teal)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
              <DashboardIcon name="lock" className="h-3 w-3" />
              Dedicated
            </span>
          </div>

          <div>
            <div className="text-[30px] font-bold tracking-tight text-[var(--color-main-text)]">
              {formatInrPaise(data.totalPooledPaise)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <DashboardIcon name="trending-up" className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-[13px] font-semibold text-[var(--color-primary)]">
                +{formatInrPaise(data.monthNetChangePaise)} this month
              </span>
              <span className="text-[11px] text-[var(--color-secondary-text)]">
                (+{data.monthGrowthPercentage}%)
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)]/60 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal('new-fund')}
              className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] text-[13px] font-semibold text-white shadow-sm transition-transform active:scale-[0.985]"
            >
              <DashboardIcon name="plus" className="h-4 w-4" />
              <span>New Fund</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('deposit')}
              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] text-[13px] font-semibold text-[var(--color-primary)] transition-transform active:scale-[0.985]"
            >
              <DashboardIcon name="arrow-down" className="h-4 w-4" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('withdraw')}
              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] text-[13px] font-semibold text-[var(--color-primary)] transition-transform active:scale-[0.985]"
            >
              <DashboardIcon name="arrow-up" className="h-4 w-4" />
              <span>Withdraw</span>
            </button>
          </div>

          {/* Interactive Mock Modal/Banner */}
          {activeModal && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="savings-action-dialog-title"
              className="mt-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-light-teal)]/50 p-3"
            >
              <h4
                id="savings-action-dialog-title"
                className="text-xs font-bold text-[var(--color-primary)]"
              >
                {activeModal === 'new-fund'
                  ? 'Create New Savings Fund'
                  : activeModal === 'deposit'
                    ? 'Record Fund Deposit'
                    : 'Record Fund Withdrawal'}
              </h4>
              <p className="mt-0.5 text-[11px] text-[var(--color-secondary-text)]">
                Mock mode: Fund transactions are pre-populated. Persistent entry will be available
                in the storage stage.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Savings Fund Goals List */}
        <section aria-label="Active Goals" className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[17px] font-semibold text-[var(--color-main-text)]">
              Active Goals
            </h2>
            <span className="text-[11px] font-medium text-[var(--color-secondary-text)]">
              {data.funds.length} Accounts
            </span>
          </div>

          <div className="space-y-3">
            {data.funds.map((fund) => {
              const progress = calculateFundProgress(fund.balancePaise, fund.targetPaise);

              return (
                <article
                  key={fund.id}
                  aria-label={`${fund.name}: ${formatInrPaise(fund.balancePaise)} of ${formatInrPaise(fund.targetPaise)}`}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_2px_8px_rgba(32,42,39,0.03)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                        <DashboardIcon name={fund.icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-semibold leading-snug text-[var(--color-main-text)]">
                          {fund.name}
                        </h3>
                        {fund.targetDateLabel ? (
                          <div className="mt-0.5 flex items-center gap-1 text-[13px] text-[var(--color-secondary-text)]">
                            <DashboardIcon name="calendar" className="h-3.5 w-3.5" />
                            <span>Target Date: {fund.targetDateLabel}</span>
                          </div>
                        ) : (
                          <p className="text-[13px] text-[var(--color-secondary-text)]">
                            {fund.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="rounded-lg bg-[var(--color-light-teal)] px-2 py-0.5 text-[13px] font-bold text-[var(--color-primary)]">
                      {progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#dae5e0]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-[var(--color-main-text)]">
                        {formatInrPaise(fund.balancePaise)}
                      </span>
                      <span className="text-[var(--color-secondary-text)]">
                        Target: {formatInrPaise(fund.targetPaise)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Recent Savings Activity Section */}
        <section aria-label="Recent Savings Activity" className="mb-2 flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[17px] font-semibold text-[var(--color-main-text)]">
              Recent Savings Activity
            </h2>
            <button
              type="button"
              className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline active:opacity-80"
            >
              View All
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_2px_8px_rgba(32,42,39,0.03)]">
            {data.recentActivities.map((act) => {
              const isDeposit = act.type === 'deposit';

              return (
                <div key={act.id} className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isDeposit
                          ? 'bg-[var(--color-light-teal)] text-[var(--color-primary)]'
                          : 'bg-[#dae5e0]/60 text-[var(--color-secondary-text)]'
                      }`}
                    >
                      <DashboardIcon
                        name={isDeposit ? 'add-circle' : 'remove-circle'}
                        className="h-5 w-5"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-[var(--color-main-text)]">
                        {act.fundName}
                      </span>
                      <span className="text-[12px] text-[var(--color-secondary-text)]">
                        {act.dateLabel} • {act.actor ?? act.detail}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[14px] font-bold tabular-nums ${
                      isDeposit ? 'text-[var(--color-primary)]' : 'text-[var(--color-main-text)]'
                    }`}
                  >
                    {isDeposit ? '+' : '-'}
                    {formatInrPaise(act.amountPaise)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Shared Semantic Bottom Navigation */}
      <HouseholdBottomNavigation active="savings" />
    </div>
  );
}

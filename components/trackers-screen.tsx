'use client';

import { useState } from 'react';
import Link from 'next/link';

import { DashboardIcon } from '@/components/dashboard-icon';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import { formatInrPaise } from '@/lib/household-dashboard-data';
import {
  calculateNetSpending,
  calculateRemainingCap,
  calculateUtilizationPct,
  groupTrackers,
  mockTrackers,
  type Tracker,
} from '@/lib/trackers-data';

type FilterTab = 'active' | 'ended' | 'hidden';

interface TrackersScreenProps {
  initialTrackers?: Tracker[];
}

export function TrackersScreen({ initialTrackers = mockTrackers }: TrackersScreenProps) {
  const [trackers, setTrackers] = useState<Tracker[]>(initialTrackers);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [showHelp, setShowHelp] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const groups = groupTrackers(trackers);
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: groups.active.length },
    { key: 'ended', label: 'Ended', count: groups.ended.length },
    { key: 'hidden', label: 'Hidden', count: groups.hidden.length },
  ];

  const visibleTrackers = groups[activeTab];

  function reopenTracker(id: string) {
    setTrackers((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'active' as const } : t)));
  }

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
            {/* Household Workspace Pill */}
            <Link
              href="/workspaces"
              aria-label="Switch workspace, currently Household"
              className="mb-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-light-teal)] px-2.5 py-0.5 transition-transform active:scale-[0.985]"
            >
              <span className="select-none text-[11px] leading-tight">🏠</span>
              <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                Household
              </span>
            </Link>
            <h1 className="text-[17px] font-bold tracking-tight text-[var(--color-primary)]">
              Trackers &amp; Projects
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
            aria-label="Trackers policy guide"
            className="border-t border-[var(--color-border)] bg-white px-5 py-3 text-xs leading-relaxed text-[var(--color-secondary-text)]"
          >
            <p className="font-semibold text-[var(--color-main-text)]">
              Tracker Rules (PRD Section 5):
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Trackers are independent of monthly budgets and savings.</li>
              <li>No start or end dates required — active until manually ended.</li>
              <li>Tracker report = Gross Expenses − Refunds = Net Spending.</li>
              <li>Ended trackers are read-only until reopened.</li>
            </ul>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-5 px-5 pt-4">
        {/* Info Banner */}
        <section
          aria-label="Trackers info"
          className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-light-teal)] p-3.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-sm shadow-sm">
            <DashboardIcon name="compass" className="h-4 w-4 text-[var(--color-primary)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-main-text)]">
            Independent event &amp; trip spending trackers. Trackers do not require start or end
            dates and do not interfere with your monthly budget.
          </p>
        </section>

        {/* Create Tracker CTA */}
        <section>
          <button
            type="button"
            onClick={() => setActiveAction('create')}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(23,107,87,0.16)] transition-transform active:scale-[0.985] hover:opacity-95"
          >
            <DashboardIcon name="plus" className="h-5 w-5" />
            <span>Create Tracker</span>
          </button>

          {/* Mock action feedback */}
          {activeAction === 'create' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tracker-action-title"
              className="mt-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-light-teal)]/50 p-3"
            >
              <h4
                id="tracker-action-title"
                className="text-xs font-bold text-[var(--color-primary)]"
              >
                Create New Tracker
              </h4>
              <p className="mt-0.5 text-[11px] text-[var(--color-secondary-text)]">
                Mock mode: Tracker creation will be available in the persistence stage.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Segmented Filter Tabs */}
        <section aria-label="Filter trackers">
          <div className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[#E4E9E5]/60 p-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={isActive}
                  className={`flex-1 rounded-xl py-2 px-2 text-center text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-[var(--color-primary)] shadow-sm'
                      : 'text-[var(--color-secondary-text)] hover:text-[var(--color-main-text)]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </section>

        {/* Tracker List */}
        {activeTab === 'active' && (
          <section aria-label="Active projects" className="space-y-4 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[13px] font-semibold text-[var(--color-secondary-text)]">
                Active Projects
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                Live Calculation
              </span>
            </div>

            {visibleTrackers.length === 0 ? (
              <EmptyState message="No active trackers. Create one to get started." />
            ) : (
              visibleTrackers.map((tracker) => (
                <ActiveTrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  onAction={(action) => setActiveAction(`${action}:${tracker.id}`)}
                  actionKey={activeAction}
                />
              ))
            )}
          </section>
        )}

        {activeTab === 'ended' && (
          <section aria-label="Concluded archives" className="space-y-3 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[13px] font-semibold text-[var(--color-secondary-text)]">
                Concluded Archives
              </span>
              <span className="text-[11px] text-[var(--color-secondary-text)]">Read-Only</span>
            </div>

            {visibleTrackers.length === 0 ? (
              <EmptyState message="No ended trackers yet." />
            ) : (
              visibleTrackers.map((tracker) => (
                <EndedTrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  onReopen={() => reopenTracker(tracker.id)}
                />
              ))
            )}
          </section>
        )}

        {activeTab === 'hidden' && (
          <section aria-label="Hidden trackers" className="space-y-3 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[13px] font-semibold text-[var(--color-secondary-text)]">
                Hidden Trackers
              </span>
              <span className="text-[11px] text-[var(--color-secondary-text)]">
                Not visible in dashboards
              </span>
            </div>
            <EmptyState message="No hidden trackers." />
          </section>
        )}
      </main>

      {/* Shared Bottom Navigation — Trackers sits under More per Stitch */}
      <HouseholdBottomNavigation active="more" />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white py-8 text-center text-[13px] text-[var(--color-secondary-text)]">
      {message}
    </div>
  );
}

interface ActiveTrackerCardProps {
  tracker: Tracker;
  onAction: (action: string) => void;
  actionKey: string | null;
}

function ActiveTrackerCard({ tracker, onAction, actionKey }: ActiveTrackerCardProps) {
  const netSpend = calculateNetSpending(tracker);
  const remaining = calculateRemainingCap(tracker);
  const utilizationPct = calculateUtilizationPct(tracker);

  const isNearLimit = utilizationPct != null && utilizationPct >= 80;
  const isOverLimit = remaining != null && remaining < 0;

  const remainingColor = isOverLimit
    ? 'text-red-600'
    : isNearLimit
      ? 'text-orange-600'
      : 'text-[var(--color-primary)]';

  // Show mock action banner for this card's actions
  const showAddExpense = actionKey === `add-expense:${tracker.id}`;
  const showViewDetails = actionKey === `view-details:${tracker.id}`;
  const showOptions = actionKey === `options:${tracker.id}`;

  return (
    <article
      aria-label={`Tracker: ${tracker.name}`}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[0_2px_8px_rgba(32,42,39,0.03)]"
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
            <DashboardIcon name={tracker.icon} className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold leading-snug text-[var(--color-main-text)]">
              {tracker.name}
            </h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[13px] text-[var(--color-secondary-text)]">
                {tracker.transactionCount} transactions
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-border)]" />
              {isNearLimit ? (
                <span className="inline-flex items-center rounded-md bg-[#FFDAD6] px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                  Near Limit ({utilizationPct}%)
                </span>
              ) : tracker.isHousehold ? (
                <span className="text-[13px] text-[var(--color-secondary-text)]">
                  Household shared
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Tracker options"
          onClick={() => onAction('options')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-secondary-text)] hover:bg-[var(--color-light-teal)] active:scale-[0.985] transition-all"
        >
          {/* three-dot vertical */}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Options mock banner */}
      {showOptions && (
        <MockBanner
          title="Tracker Options"
          description="End, hide, or delete tracker — available in persistence stage."
          onClose={() => onAction('close')}
        />
      )}

      {/* Financial metrics grid */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
        <div>
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-secondary-text)]">
            Net Spent
          </span>
          <span className="text-[22px] font-bold leading-tight tabular-nums text-[var(--color-main-text)]">
            {formatInrPaise(netSpend)}
          </span>
        </div>
        {remaining != null && (
          <div>
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-secondary-text)]">
              Remaining Cap
            </span>
            <span className={`text-[22px] font-bold leading-tight tabular-nums ${remainingColor}`}>
              {formatInrPaise(Math.abs(remaining))}
              {isOverLimit && <span className="ml-0.5 text-[14px]">over</span>}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {utilizationPct != null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span
              className={`font-medium ${isNearLimit ? 'text-red-700' : 'text-[var(--color-secondary-text)]'}`}
            >
              {utilizationPct}% utilized
            </span>
            {tracker.capPaise != null && (
              <span className="text-[var(--color-secondary-text)]">
                Budget cap: {formatInrPaise(tracker.capPaise)}
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#dae5e0]">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isNearLimit ? 'bg-red-400' : 'bg-[var(--color-primary)]'
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent expense chips */}
      {tracker.recentChips && tracker.recentChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tracker.recentChips.map((chip) => (
            <span
              key={chip.label}
              className="rounded-lg bg-[var(--color-light-teal)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]"
            >
              {chip.label} ({formatInrPaise(chip.amountPaise)})
            </span>
          ))}
          {tracker.transactionCount > tracker.recentChips.length && (
            <span className="rounded-lg bg-[var(--color-light-teal)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]">
              +{tracker.transactionCount - tracker.recentChips.length} more
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => onAction('view-details')}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] text-[13px] font-semibold text-[var(--color-primary)] transition-all active:scale-[0.985]"
        >
          <DashboardIcon name="receipt" className="h-4 w-4" />
          <span>View Details</span>
        </button>
        <button
          type="button"
          onClick={() => onAction('add-expense')}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] text-[13px] font-semibold text-white shadow-sm transition-all active:scale-[0.985]"
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* Mock banners */}
      {showViewDetails && (
        <MockBanner
          title="Tracker Details"
          description="Full transaction ledger will be available in the persistence stage."
          onClose={() => onAction('close')}
        />
      )}
      {showAddExpense && (
        <MockBanner
          title="Add Tracker Expense"
          description="Expense entry will be available in the persistence stage."
          onClose={() => onAction('close')}
        />
      )}
    </article>
  );
}

interface EndedTrackerCardProps {
  tracker: Tracker;
  onReopen: () => void;
}

function EndedTrackerCard({ tracker, onReopen }: EndedTrackerCardProps) {
  const netSpend = calculateNetSpending(tracker);

  return (
    <article
      aria-label={`Ended tracker: ${tracker.name}`}
      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/60 bg-white/70 p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dae5e0] text-[var(--color-secondary-text)]">
            <DashboardIcon name={tracker.icon} className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold leading-snug text-[var(--color-main-text)]">
              {tracker.name}
            </h3>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--color-secondary-text)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-secondary-text)]" />
              Ended{tracker.endedLabel ? ` · ${tracker.endedLabel}` : ''} · Read-only
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onReopen}
          className="rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-light-teal)] active:scale-[0.985] transition-all"
        >
          Reopen
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)]/40 pt-2 text-[13px]">
        <span className="text-[var(--color-secondary-text)]">
          Final Spend:{' '}
          <span className="font-semibold text-[var(--color-main-text)]">
            {formatInrPaise(netSpend)}
          </span>
        </span>
        {tracker.capPaise != null && (
          <span className="text-[var(--color-secondary-text)]">
            Budget: {formatInrPaise(tracker.capPaise)}
          </span>
        )}
      </div>
    </article>
  );
}

function MockBanner({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-light-teal)]/50 p-3"
    >
      <h4 className="text-xs font-bold text-[var(--color-primary)]">{title}</h4>
      <p className="mt-0.5 text-[11px] text-[var(--color-secondary-text)]">{description}</p>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

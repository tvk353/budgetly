'use client';

import { useState } from 'react';
import Link from 'next/link';

import { DashboardIcon } from '@/components/dashboard-icon';
import { HouseholdBottomNavigation } from '@/components/household-bottom-navigation';
import { mockMoreHubData, type MoreHubData } from '@/lib/more-data';

interface MoreHubScreenProps {
  initialData?: MoreHubData;
}

export function MoreHubScreen({ initialData = mockMoreHubData }: MoreHubScreenProps) {
  const [data] = useState<MoreHubData>(initialData);
  const [showHelp, setShowHelp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleUnavailable = (featureName: string) => {
    setNotice(`${featureName} is not available yet.`);
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[393px] flex-col bg-[var(--color-background)] pb-28 text-[var(--color-main-text)]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color:rgba(250,249,246,0.92)] px-5 pb-2 pt-safe backdrop-blur-md">
        <div className="flex h-12 w-full items-center justify-between">
          <Link
            href="/workspace/household"
            aria-label="Back"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-secondary-text)] transition-transform hover:opacity-80 active:scale-[0.985]"
          >
            <DashboardIcon name="chevron-left" className="h-5 w-5" />
          </Link>

          <h1 className="text-[17px] font-bold tracking-tight text-[var(--color-primary)]">
            More &amp; Settings
          </h1>

          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-label="Help & Guidance"
            aria-expanded={showHelp}
            className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-secondary-text)] transition-transform hover:opacity-80 active:scale-[0.985]"
          >
            <DashboardIcon name="help" className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Context Pill */}
        <div className="flex justify-center pb-1">
          <Link
            href="/workspaces"
            aria-label="Switch workspace, currently Household with 2 members"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-light-teal)] px-3 py-1 transition-transform active:scale-[0.985]"
          >
            <span className="text-[13px] select-none">🏠</span>
            <span className="text-[11px] font-semibold text-[var(--color-primary)]">
              Household (2 members)
            </span>
            <DashboardIcon name="chevron-down" className="h-3 w-3 text-[var(--color-primary)]" />
          </Link>
        </div>

        {/* Expandable Help Drawer */}
        {showHelp && (
          <div
            role="region"
            aria-label="More Hub Guidance"
            className="mt-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-xs leading-relaxed text-[var(--color-secondary-text)]"
          >
            <p className="font-semibold text-[var(--color-main-text)]">More &amp; Settings Hub:</p>
            <p className="mt-1">
              Access household management, workspace switching, category administration, trash recovery, and data export settings.
            </p>
          </div>
        )}
      </header>

      {/* Main Content Stream */}
      <main className="flex-1 space-y-4 px-5 pt-3">
        {/* Floating Notice Banner for unavailable features */}
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3 text-xs text-[var(--color-secondary-text)] shadow-sm"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-[11px] font-semibold text-[var(--color-primary)]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* USER PROFILE CARD */}
        <section
          aria-label="User Profile"
          className="rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-soft-green)] bg-[var(--color-light-teal)] text-lg font-bold tracking-tight text-[var(--color-primary)]">
              {data.user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[16px] font-bold text-[var(--color-main-text)]">
                  {data.user.name}
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#baefcc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  {data.user.role}
                </span>
              </div>
              <p className="truncate text-[13px] text-[var(--color-secondary-text)]">
                {data.user.email}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                <span>{data.user.workspaceStatus}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUnavailable('Edit Profile')}
              title="Edit Profile is not available yet"
              aria-label="Edit Profile, not available yet"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-light-teal)] text-[var(--color-primary)] opacity-80 transition-transform active:scale-[0.985]"
            >
              <DashboardIcon name="edit" className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* FEATURES & INSIGHTS BENTO GRID */}
        <section aria-label="Features and Insights" className="space-y-2">
          <div className="px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-secondary-text)]">
              Features &amp; Insights
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Shortcut 1: Trackers & Projects */}
            <button
              type="button"
              onClick={() => handleUnavailable('Trackers & Projects')}
              title="Trackers & Projects is not available yet"
              aria-label="Trackers & Projects, 2 active, not available yet"
              className="col-span-2 flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="compass" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--color-main-text)]">
                    Trackers &amp; Projects
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Goals, trips &amp; micro-ledgers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#baefcc] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {data.activeTrackersCount} active
                </span>
                <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
              </div>
            </button>

            {/* Shortcut 2: Financial Reports */}
            <button
              type="button"
              onClick={() => handleUnavailable('Reports')}
              title="Reports is not available yet"
              aria-label="Reports, not available yet"
              className="flex h-28 cursor-pointer flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="bar-chart" className="h-5 w-5" />
                </div>
                <DashboardIcon name="arrow-outward" className="h-4 w-4 text-[var(--color-secondary-text)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-main-text)]">Reports</p>
                <p className="truncate text-[11px] text-[var(--color-secondary-text)]">
                  CSV export &amp; trends
                </p>
              </div>
            </button>

            {/* Shortcut 3: Category Management */}
            <button
              type="button"
              onClick={() => handleUnavailable('Category Envelopes')}
              title="Category Envelopes is not available yet"
              aria-label="Envelopes, 14 categories, not available yet"
              className="flex h-28 cursor-pointer flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="category" className="h-5 w-5" />
                </div>
                <DashboardIcon name="arrow-outward" className="h-4 w-4 text-[var(--color-secondary-text)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-main-text)]">Envelopes</p>
                <p className="truncate text-[11px] text-[var(--color-secondary-text)]">
                  {data.totalCategoriesCount} categories
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* HOUSEHOLD STEWARDSHIP CARD */}
        <section aria-label="Household Stewardship" className="space-y-2">
          <div className="px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-secondary-text)]">
              Household Stewardship
            </h3>
          </div>

          <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
            {/* Row 1: Members */}
            <button
              type="button"
              onClick={() => handleUnavailable('Household Members')}
              title="Household Members is not available yet"
              aria-label="Household Members, Synced, not available yet"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="users" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Household Members
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {data.members.map((member) => (
                        <span
                          key={member.initials}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white ring-1 ring-white"
                        >
                          {member.initials}
                        </span>
                      ))}
                    </div>
                    <span className="text-[12px] text-[var(--color-secondary-text)]">
                      {data.members.map((m) => m.name).join(' & ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--color-light-teal)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  Synced
                </span>
                <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
              </div>
            </button>

            {/* Row 2: Workspace Mode Switcher (Active Link to /workspaces) */}
            <Link
              href="/workspaces"
              aria-label="Workspace Switcher, Active: Household Shared, click to switch"
              className="flex items-center justify-between p-3.5 transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="home" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Workspace Switcher
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Active: Household Shared
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-primary)]">
                <span>Switch</span>
                <DashboardIcon name="refresh" className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* DATA & LEDGER VAULT SECTION */}
        <section aria-label="Data and Ledger Vault" className="space-y-2">
          <div className="px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-secondary-text)]">
              Data &amp; Ledger Vault
            </h3>
          </div>

          <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
            {/* Row 1: Trash & 30-Day Bin */}
            <button
              type="button"
              onClick={() => handleUnavailable('Trash & Recovery')}
              title="Trash & Recovery is not available yet"
              aria-label="Trash & Recovery, 3 items in 30-day bin, not available yet"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="trash" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Trash &amp; Recovery
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    {data.trashItemsCount} items in 30-day bin
                  </p>
                </div>
              </div>
              <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
            </button>

            {/* Row 2: Data Export & Backup */}
            <button
              type="button"
              onClick={() => handleUnavailable('Data Export & Backup')}
              title="Data Export & Backup is not available yet"
              aria-label="Data Export & Backup, Encrypted JSON & clean CSV, not available yet"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="cloud-download" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Data Export &amp; Backup
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Encrypted JSON &amp; clean CSV
                  </p>
                </div>
              </div>
              <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
            </button>
          </div>
        </section>

        {/* PREFERENCES & SECURITY SECTION */}
        <section aria-label="Preferences and Security" className="space-y-2">
          <div className="px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-secondary-text)]">
              Preferences &amp; Security
            </h3>
          </div>

          <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
            {/* Row 1: Appearance & Locale */}
            <button
              type="button"
              onClick={() => handleUnavailable('Appearance & Locale')}
              title="Appearance & Locale is not available yet"
              aria-label="Appearance & Locale, Light Paper, Currency INR, not available yet"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="tune" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Appearance &amp; Locale
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Light Paper · Currency: ₹ INR
                  </p>
                </div>
              </div>
              <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
            </button>

            {/* Row 2: Security & Privacy */}
            <button
              type="button"
              onClick={() => handleUnavailable('Security & Privacy')}
              title="Security & Privacy is not available yet"
              aria-label="Security & Privacy, Passwordless, Device biometric, not available yet"
              className="flex w-full cursor-pointer items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-primary)]">
                  <DashboardIcon name="shield" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)]">
                    Security &amp; Privacy
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Passwordless · Device biometric
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
              </div>
            </button>

            {/* Row 3: Log Out (Active Link to /) */}
            <Link
              href="/"
              aria-label="Sign Out of Budgetly"
              className="group flex items-center justify-between p-3.5 transition-transform active:scale-[0.985]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-secondary-text)] transition-colors group-hover:text-rose-600">
                  <DashboardIcon name="logout" className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-main-text)] transition-colors group-hover:text-rose-600">
                    Sign Out of Budgetly
                  </p>
                  <p className="text-[12px] text-[var(--color-secondary-text)]">
                    Local encryption key remains safe
                  </p>
                </div>
              </div>
              <DashboardIcon name="chevron-right" className="h-4 w-4 text-[var(--color-secondary-text)]" />
            </Link>
          </div>
        </section>

        {/* Subdued App Version Stamp */}
        <div className="pb-6 pt-2 text-center">
          <p className="text-[11px] font-medium text-[var(--color-secondary-text)]">
            {data.appVersion}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-secondary-text)]/80">
            {data.appTagline}
          </p>
        </div>
      </main>

      {/* Shared Semantic Bottom Navigation */}
      <HouseholdBottomNavigation active="more" />
    </div>
  );
}


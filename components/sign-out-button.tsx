'use client';

import { useState } from 'react';
import { authRequest, navigateAfterAuth } from '@/lib/auth/client';
import { DashboardIcon } from '@/components/dashboard-icon';

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError('');
          try {
            await authRequest('logout');
            navigateAfterAuth('/');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Unable to sign out.');
            setPending(false);
          }
        }}
        className="group flex w-full items-center justify-between p-3.5 text-left transition-transform active:scale-[0.985]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light-teal)] text-[var(--color-secondary-text)] transition-colors group-hover:text-rose-600">
            <DashboardIcon name="logout" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-[var(--color-main-text)] transition-colors group-hover:text-rose-600">
              {pending ? 'Signing out...' : 'Sign Out of Budgetly'}
            </span>
            <span
              aria-hidden="true"
              className="block text-[12px] text-[var(--color-secondary-text)]"
            >
              End this device&apos;s session
            </span>
          </span>
        </span>
        <DashboardIcon
          name="chevron-right"
          className="h-4 w-4 text-[var(--color-secondary-text)]"
        />
      </button>
      {error && (
        <p role="alert" className="px-3.5 pb-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

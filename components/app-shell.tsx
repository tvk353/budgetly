import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-sm">
              ₹
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
                Private household
              </p>
              <h1 className="text-xl font-semibold text-[var(--color-main-text)]">Budgetly</h1>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

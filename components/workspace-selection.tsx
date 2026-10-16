'use client';

import { useRouter } from 'next/navigation';

const workspaceOptions = [
  {
    id: 'household',
    name: 'Household',
    description: 'Shared household finances for you and your wife.',
    badge: 'Default workspace',
    primary: true,
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Your private finances, separate from the household.',
    badge: null,
    primary: false,
  },
] as const;

export function WorkspaceSelection() {
  const router = useRouter();

  return (
    <section aria-labelledby="workspace-heading">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
        Workspace
      </p>
      <h2
        id="workspace-heading"
        className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]"
      >
        Where would you like to go?
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">
        Choose the finances you want to manage.
      </p>

      <div className="mt-7 grid gap-3">
        {workspaceOptions.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            aria-label={`Choose ${workspace.name} workspace`}
            onClick={() => router.push(`/workspace/${workspace.id}`)}
            className={`w-full rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
              workspace.primary
                ? 'border-[var(--color-primary)] bg-[var(--color-light-teal)] shadow-[0_10px_28px_rgba(23,107,87,0.12)]'
                : 'border-[var(--color-border)] bg-[var(--color-card-surface)] hover:border-[var(--color-soft-green)]'
            }`}
          >
            <span className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-lg font-semibold text-[var(--color-main-text)]">
                  {workspace.name}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--color-secondary-text)]">
                  {workspace.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="pt-1 text-xl font-medium text-[var(--color-primary)]"
              >
                ›
              </span>
            </span>
            {workspace.badge ? (
              <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                {workspace.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

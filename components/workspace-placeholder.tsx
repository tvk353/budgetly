import Link from 'next/link';

export type WorkspaceKind = 'household' | 'personal';

const workspaceDetails: Record<WorkspaceKind, { name: string; description: string }> = {
  household: {
    name: 'Household',
    description: 'Shared finances for your household members.',
  },
  personal: {
    name: 'Personal',
    description: 'Your private finances, separate from the household.',
  },
};

export function WorkspacePlaceholder({
  workspace,
  name,
}: {
  workspace: WorkspaceKind;
  name?: string;
}) {
  const details = workspaceDetails[workspace];

  return (
    <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card-surface)] p-6 shadow-[0_10px_35px_rgba(23,107,87,0.08)] sm:p-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
        Selected workspace
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]">
        {name ?? details.name}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">
        {details.description}
      </p>
      <p className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
        Your {details.name.toLowerCase()} workspace is selected.
      </p>
      <Link
        href="/workspaces"
        className="mt-6 inline-flex min-h-11 items-center font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        Change workspace
      </Link>
    </section>
  );
}

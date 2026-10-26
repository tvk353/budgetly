'use client';

import { useEffect, useState } from 'react';
import { SignOutButton } from '@/components/sign-out-button';
import { loadWorkspaces, selectWorkspace } from '@/lib/workspace-client';
import { getDefaultWorkspace, type Workspace } from '@/lib/workspace-data';

export function WorkspaceSelection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadWorkspaces(controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setWorkspaces(records);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : 'Unable to load workspaces.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  const defaultWorkspace = getDefaultWorkspace(workspaces);
  const chooseWorkspace = async (workspace: Workspace) => {
    if (selecting) return;
    setSelecting(workspace.id);
    setError('');
    try {
      const selected = await selectWorkspace(workspace.id);
      window.location.assign(`/workspace/${selected.type}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to open the workspace.');
      setSelecting(null);
    }
  };

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
        {!loading &&
          workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              aria-label={`Choose ${workspace.name} workspace`}
              disabled={selecting !== null}
              onClick={() => void chooseWorkspace(workspace)}
              className={`w-full rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                workspace.id === defaultWorkspace?.id
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
                    {workspace.type === 'household'
                      ? 'Shared finances for your household members.'
                      : 'Your private finances, separate from the household.'}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="pt-1 text-xl font-medium text-[var(--color-primary)]"
                >
                  ›
                </span>
              </span>
              {workspace.id === defaultWorkspace?.id ? (
                <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                  Default workspace
                </span>
              ) : null}
            </button>
          ))}
      </div>
      {loading && (
        <p role="status" className="mt-4 text-sm">
          Loading your workspaces...
        </p>
      )}
      {error && (
        <div role="alert" className="mt-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            disabled={selecting !== null}
            onClick={() => {
              setLoading(true);
              setError('');
              setWorkspaces([]);
              setReload((value) => value + 1);
            }}
            className="mt-2 font-semibold underline"
          >
            Reload workspaces
          </button>
        </div>
      )}
      {!loading && !error && !workspaces.length && (
        <p role="status" className="mt-4 text-sm">
          No active workspaces are available for this account.
        </p>
      )}
      {!loading &&
        !error &&
        workspaces.some((workspace) => workspace.type === 'personal') &&
        !workspaces.some((workspace) => workspace.type === 'household') && (
          <p className="mt-4 rounded-2xl bg-[var(--color-light-teal)] p-4 text-sm text-[var(--color-main-text)]">
            Your Personal workspace is ready. Household setup is limited to the shared account.
            Other accounts need an existing active Household membership; invitation joining is not
            available yet.
          </p>
        )}
      <SignOutButton />
    </section>
  );
}

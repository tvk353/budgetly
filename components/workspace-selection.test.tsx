import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspacePlaceholder } from './workspace-placeholder';
import { WorkspaceSelection } from './workspace-selection';

const mocks = vi.hoisted(() => ({ load: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/workspace-client', () => ({
  loadWorkspaces: mocks.load,
  selectWorkspace: mocks.select,
}));
const personal = { id: 'personal-id', name: 'My private space', type: 'personal', created_at: '' };
const household = { id: 'household-id', name: 'Our home', type: 'household', created_at: '' };

beforeEach(() => {
  mocks.load.mockReset().mockResolvedValue([personal, household]);
  mocks.select.mockReset();
});

describe('WorkspaceSelection', () => {
  it('loads real names and marks an authorized Household as default', async () => {
    render(<WorkspaceSelection />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspaces');
    const button = await screen.findByRole('button', { name: 'Choose Our home workspace' });
    expect(within(button).getByText('Default workspace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Choose My private space workspace' }),
    ).toBeInTheDocument();
    expect(mocks.load).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('does not collapse multiple Household memberships into a single option', async () => {
    mocks.load.mockResolvedValue([
      household,
      { ...household, id: 'second-id', name: 'Another home' },
    ]);
    render(<WorkspaceSelection />);
    expect(
      await screen.findByRole('button', { name: 'Choose Another home workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Our home workspace' })).toBeInTheDocument();
    expect(screen.getAllByText('Default workspace')).toHaveLength(1);
  });

  it('offers Personal as default without inventing Household membership', async () => {
    mocks.load.mockResolvedValue([personal]);
    render(<WorkspaceSelection />);
    const button = await screen.findByRole('button', { name: 'Choose My private space workspace' });
    expect(within(button).getByText('Default workspace')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Our home/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Household creation and invitation joining are not available/),
    ).toBeInTheDocument();
  });

  it('reports empty membership without claiming Personal is ready', async () => {
    mocks.load.mockResolvedValue([]);
    render(<WorkspaceSelection />);
    expect(
      await screen.findByText('No active workspaces are available for this account.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Personal workspace is ready/)).not.toBeInTheDocument();
  });

  it('surfaces API failure and supports retry without fake cards', async () => {
    mocks.load.mockRejectedValueOnce(new Error('Sign in to continue.'));
    render(<WorkspaceSelection />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to continue.');
    expect(screen.queryByRole('button', { name: /Choose/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspaces' }));
    expect(
      await screen.findByRole('button', { name: 'Choose Our home workspace' }),
    ).toBeInTheDocument();
  });

  it('submits the exact selected ID and surfaces revoked membership without navigating', async () => {
    mocks.select.mockRejectedValue(new Error('Workspace not found.'));
    render(<WorkspaceSelection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Our home workspace' }));
    await waitFor(() => expect(mocks.select).toHaveBeenCalledWith('household-id'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Workspace not found.');
    expect(screen.getByRole('button', { name: 'Choose Our home workspace' })).toBeEnabled();
  });
});

describe('WorkspacePlaceholder', () => {
  it('uses the real selected workspace name', () => {
    render(<WorkspacePlaceholder workspace="personal" name="My private space" />);
    expect(screen.getByRole('heading', { name: 'My private space' })).toBeInTheDocument();
    expect(screen.getByText('Your personal workspace is selected.')).toBeInTheDocument();
  });
});

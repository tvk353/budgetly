import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { WorkspacePlaceholder } from './workspace-placeholder';
import { WorkspaceSelection } from './workspace-selection';

describe('WorkspaceSelection', () => {
  it('renders Household and Personal, with Household marked as the default', () => {
    render(<WorkspaceSelection />);

    expect(screen.getByRole('button', { name: 'Choose Household workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Personal workspace' })).toBeInTheDocument();
    expect(screen.getByText('Default workspace')).toBeInTheDocument();
    expect(
      screen.getByText('Shared household finances for you and your wife.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your private finances, separate from the household.'),
    ).toBeInTheDocument();
  });

  it('navigates to each workspace destination when selected', () => {
    render(<WorkspaceSelection />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose Household workspace' }));
    expect(push).toHaveBeenCalledWith('/workspace/household');

    fireEvent.click(screen.getByRole('button', { name: 'Choose Personal workspace' }));
    expect(push).toHaveBeenCalledWith('/workspace/personal');
  });
});

describe('WorkspacePlaceholder', () => {
  it('identifies the selected Household workspace', () => {
    render(<WorkspacePlaceholder workspace="household" />);

    expect(screen.getByRole('heading', { name: 'Household' })).toBeInTheDocument();
    expect(screen.getByText('Your household workspace is selected.')).toBeInTheDocument();
  });

  it('identifies the selected Personal workspace', () => {
    render(<WorkspacePlaceholder workspace="personal" />);

    expect(screen.getByRole('heading', { name: 'Personal' })).toBeInTheDocument();
    expect(screen.getByText('Your personal workspace is selected.')).toBeInTheDocument();
  });
});

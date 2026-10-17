import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MoreHubScreen } from './more-hub-screen';

describe('MoreHubScreen', () => {
  it('renders the header, profile, workspace context pill, and active More navigation', () => {
    render(<MoreHubScreen />);

    expect(screen.getByRole('heading', { level: 1, name: 'More & Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/workspace/household',
    );
    expect(
      screen.getByRole('link', { name: /switch workspace, currently household with 2 members/i }),
    ).toHaveAttribute('href', '/workspaces');

    // Bottom Navigation
    const moreNav = screen.getByRole('link', { name: 'More' });
    expect(moreNav).toBeInTheDocument();
    expect(moreNav).toHaveAttribute('href', '/more');
    expect(moreNav).toHaveAttribute('aria-current', 'page');

    // Profile
    expect(screen.getByRole('heading', { level: 2, name: 'Aarav Sharma' })).toBeInTheDocument();
    expect(screen.getAllByText('AS')).toHaveLength(2);
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('aarav@example.com')).toBeInTheDocument();
    expect(screen.getByText('Workspace: Household (Active)')).toBeInTheDocument();
  });

  it('renders the Features & Insights bento shortcuts', () => {
    render(<MoreHubScreen />);

    expect(screen.getByRole('region', { name: 'Features and Insights' })).toBeInTheDocument();
    expect(screen.getByText('Trackers & Projects')).toBeInTheDocument();
    expect(screen.getByText('Goals, trips & micro-ledgers')).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('CSV export & trends')).toBeInTheDocument();

    expect(screen.getByText('Envelopes')).toBeInTheDocument();
    expect(screen.getByText('14 categories')).toBeInTheDocument();
  });

  it('renders Household Stewardship with valid link to workspaces', () => {
    render(<MoreHubScreen />);

    expect(screen.getByRole('region', { name: 'Household Stewardship' })).toBeInTheDocument();
    expect(screen.getByText('Household Members')).toBeInTheDocument();
    expect(screen.getByText('Aarav & Priya')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();

    const workspaceSwitcher = screen.getByRole('link', {
      name: /workspace switcher, active: household shared/i,
    });
    expect(workspaceSwitcher).toHaveAttribute('href', '/workspaces');
  });

  it('renders Data Vault, Security, and Sign Out linking to login', () => {
    render(<MoreHubScreen />);

    expect(screen.getByText('Trash & Recovery')).toBeInTheDocument();
    expect(screen.getByText('3 items in 30-day bin')).toBeInTheDocument();
    expect(screen.getByText('Data Export & Backup')).toBeInTheDocument();
    expect(screen.getByText('Appearance & Locale')).toBeInTheDocument();
    expect(screen.getByText('Security & Privacy')).toBeInTheDocument();

    const signOut = screen.getByRole('link', { name: 'Sign Out of Budgetly' });
    expect(signOut).toHaveAttribute('href', '/');

    // Version stamp
    expect(screen.getByText(/Budgetly iOS v2.4.1/)).toBeInTheDocument();
  });

  it('displays user feedback when clicking an unavailable feature', () => {
    render(<MoreHubScreen />);

    const reportsButton = screen.getByRole('button', { name: /reports, not available yet/i });
    fireEvent.click(reportsButton);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Reports is not available yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('toggles the guidance drawer', () => {
    render(<MoreHubScreen />);

    const helpButton = screen.getByRole('button', { name: 'Help & Guidance' });
    fireEvent.click(helpButton);
    expect(screen.getByRole('region', { name: 'More Hub Guidance' })).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(screen.queryByRole('region', { name: 'More Hub Guidance' })).not.toBeInTheDocument();
  });
});

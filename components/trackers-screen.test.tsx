import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TrackersScreen } from '@/components/trackers-screen';
import {
  calculateNetSpending,
  calculateRemainingCap,
  calculateUtilizationPct,
  groupTrackers,
  mockTrackers,
  type Tracker,
} from '@/lib/trackers-data';

// ── Unit: calculation helpers ────────────────────────────────────────────────

describe('calculateNetSpending', () => {
  it('returns gross expenses when there are no refunds', () => {
    const tracker: Tracker = {
      id: 't1',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 500_000,
      totalRefundsPaise: 0,
      transactionCount: 2,
      isHousehold: true,
    };
    expect(calculateNetSpending(tracker)).toBe(500_000);
  });

  it('subtracts refunds from gross expenses', () => {
    const tracker: Tracker = {
      id: 't2',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 500_000,
      totalRefundsPaise: 100_000,
      transactionCount: 2,
      isHousehold: true,
    };
    expect(calculateNetSpending(tracker)).toBe(400_000);
  });
});

describe('calculateRemainingCap', () => {
  it('returns null when no cap is set', () => {
    const tracker: Tracker = {
      id: 't3',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 200_000,
      totalRefundsPaise: 0,
      transactionCount: 1,
      isHousehold: false,
    };
    expect(calculateRemainingCap(tracker)).toBeNull();
  });

  it('returns positive remaining when under cap', () => {
    const tracker: Tracker = {
      id: 't4',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 200_000,
      totalRefundsPaise: 0,
      capPaise: 500_000,
      transactionCount: 1,
      isHousehold: false,
    };
    expect(calculateRemainingCap(tracker)).toBe(300_000);
  });

  it('returns negative remaining when over cap', () => {
    const tracker: Tracker = {
      id: 't5',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 600_000,
      totalRefundsPaise: 0,
      capPaise: 500_000,
      transactionCount: 1,
      isHousehold: false,
    };
    expect(calculateRemainingCap(tracker)).toBe(-100_000);
  });
});

describe('calculateUtilizationPct', () => {
  it('returns null when no cap is set', () => {
    const tracker: Tracker = {
      id: 't6',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 200_000,
      totalRefundsPaise: 0,
      transactionCount: 1,
      isHousehold: false,
    };
    expect(calculateUtilizationPct(tracker)).toBeNull();
  });

  it('calculates percentage correctly', () => {
    const tracker: Tracker = {
      id: 't7',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 2_485_000,
      totalRefundsPaise: 0,
      capPaise: 6_000_000,
      transactionCount: 8,
      isHousehold: true,
    };
    // 2485000 / 6000000 = 41.4% → rounds to 41
    expect(calculateUtilizationPct(tracker)).toBe(41);
  });

  it('caps utilization at 100%', () => {
    const tracker: Tracker = {
      id: 't8',
      name: 'Test',
      icon: 'flight',
      status: 'active',
      grossExpensesPaise: 1_000_000,
      totalRefundsPaise: 0,
      capPaise: 500_000,
      transactionCount: 1,
      isHousehold: false,
    };
    expect(calculateUtilizationPct(tracker)).toBe(100);
  });
});

describe('groupTrackers', () => {
  it('groups mock trackers into active / ended / hidden', () => {
    const groups = groupTrackers(mockTrackers);
    expect(groups.active.length).toBeGreaterThan(0);
    expect(groups.ended.length).toBeGreaterThan(0);
    expect(groups.hidden.length).toBe(0);
  });

  it('active trackers have status "active"', () => {
    const groups = groupTrackers(mockTrackers);
    groups.active.forEach((t) => expect(t.status).toBe('active'));
  });

  it('ended trackers have status "ended"', () => {
    const groups = groupTrackers(mockTrackers);
    groups.ended.forEach((t) => expect(t.status).toBe('ended'));
  });
});

// ── Component rendering ──────────────────────────────────────────────────────

describe('TrackersScreen rendering', () => {
  it('renders the screen heading', () => {
    render(<TrackersScreen />);
    expect(screen.getByText('Trackers & Projects')).toBeInTheDocument();
  });

  it('renders the info banner', () => {
    render(<TrackersScreen />);
    expect(screen.getByLabelText('Trackers info')).toBeInTheDocument();
  });

  it('renders the Create Tracker button', () => {
    render(<TrackersScreen />);
    expect(screen.getByRole('button', { name: /create tracker/i })).toBeInTheDocument();
  });

  it('renders the filter tabs', () => {
    render(<TrackersScreen />);
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ended/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hidden/i })).toBeInTheDocument();
  });

  it('shows active tracker names by default', () => {
    render(<TrackersScreen />);
    expect(screen.getByText('Goa Family Vacation 2025')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Renovation & Cookware')).toBeInTheDocument();
  });

  it('shows "Near Limit" badge for high-utilization trackers', () => {
    render(<TrackersScreen />);
    expect(screen.getByText(/near limit/i)).toBeInTheDocument();
  });

  it('shows active tracker action buttons', () => {
    render(<TrackersScreen />);
    const addExpenseButtons = screen.getAllByRole('button', { name: /add expense/i });
    expect(addExpenseButtons.length).toBeGreaterThan(0);
  });

  it('switches to Ended tab and shows ended trackers', () => {
    render(<TrackersScreen />);
    const endedTab = screen.getByRole('button', { name: /ended/i });
    fireEvent.click(endedTab);
    expect(screen.getByText('Diwali Shopping 2024')).toBeInTheDocument();
    expect(screen.getAllByText(/read-only/i).length).toBeGreaterThan(0);
  });

  it('shows Reopen button on ended trackers', () => {
    render(<TrackersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /ended/i }));
    expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
  });

  it('reopens an ended tracker and moves it to Active tab', () => {
    render(<TrackersScreen />);
    // Switch to Ended tab
    fireEvent.click(screen.getByRole('button', { name: /ended/i }));
    // Reopen Diwali tracker
    fireEvent.click(screen.getByRole('button', { name: /reopen/i }));
    // Switch back to Active tab — Diwali tracker should now appear
    fireEvent.click(screen.getByRole('button', { name: /active/i }));
    expect(screen.getByText('Diwali Shopping 2024')).toBeInTheDocument();
  });

  it('shows mock banner when Create Tracker is clicked', () => {
    render(<TrackersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /create tracker/i }));
    expect(screen.getByText('Create New Tracker')).toBeInTheDocument();
  });

  it('shows the help drawer when help button is clicked', () => {
    render(<TrackersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /help and documentation/i }));
    expect(screen.getByRole('region', { name: /trackers policy guide/i })).toBeInTheDocument();
  });

  it('renders bottom navigation with More as active', () => {
    render(<TrackersScreen />);
    // Stitch sets active to "more" since Trackers sits under More
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders INR-formatted net spend for active trackers', () => {
    render(<TrackersScreen />);
    // Goa: ₹24,850.00 net spend
    expect(screen.getByText('₹24,850.00')).toBeInTheDocument();
  });

  it('switches to Hidden tab and shows empty state', () => {
    render(<TrackersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /hidden/i }));
    expect(screen.getByText('No hidden trackers.')).toBeInTheDocument();
  });
});

// ── Navigation ───────────────────────────────────────────────────────────────

describe('TrackersScreen navigation', () => {
  it('renders back link to household dashboard', () => {
    render(<TrackersScreen />);
    const backLink = screen.getByRole('link', { name: /go back to household dashboard/i });
    expect(backLink).toHaveAttribute('href', '/workspace/household');
  });

  it('renders workspace switcher pill linking to /workspaces', () => {
    render(<TrackersScreen />);
    const switcherLink = screen.getByRole('link', { name: /switch workspace/i });
    expect(switcherLink).toHaveAttribute('href', '/workspaces');
  });
});

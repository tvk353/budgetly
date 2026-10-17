import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SavingsScreen } from './savings-screen';
import {
  calculateFundProgress,
  calculateTotalPooledSavings,
  type SavingsFund,
} from '@/lib/savings-data';

describe('SavingsScreen', () => {
  it('renders the header, isolation notice, and active Savings bottom navigation', () => {
    render(<SavingsScreen />);

    expect(screen.getByRole('heading', { level: 1, name: 'Savings Funds' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /switch workspace, currently household/i }),
    ).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('link', { name: 'Go back to Household dashboard' })).toHaveAttribute(
      'href',
      '/workspace/household',
    );

    // Isolation notice
    expect(
      screen.getByText(/Savings are completely isolated from your monthly spending budget/),
    ).toBeInTheDocument();

    // Active bottom nav
    const savingsNav = screen.getByRole('link', { name: 'Savings' });
    expect(savingsNav).toBeInTheDocument();
    expect(savingsNav).toHaveAttribute('href', '/savings');
    expect(savingsNav).toHaveAttribute('aria-current', 'page');
  });

  it('renders the total pooled savings hero card and quick actions', () => {
    render(<SavingsScreen />);

    expect(screen.getByText('Total Pooled Savings')).toBeInTheDocument();
    expect(screen.getByText('Dedicated')).toBeInTheDocument();
    expect(screen.getByText('₹3,45,000.00')).toBeInTheDocument();
    expect(screen.getByText('+₹25,000.00 this month')).toBeInTheDocument();
    expect(screen.getByText('(+7.8%)')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'New Fund' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deposit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('renders all 3 active savings fund goals with progress bars', () => {
    render(<SavingsScreen />);

    expect(screen.getByRole('heading', { level: 2, name: 'Active Goals' })).toBeInTheDocument();
    expect(screen.getByText('3 Accounts')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Emergency Fund' })).toBeInTheDocument();
    expect(screen.getByText('6 months household buffer')).toBeInTheDocument();
    expect(screen.getByText('44%')).toBeInTheDocument();
    expect(screen.getByText('₹2,20,000.00')).toBeInTheDocument();
    expect(screen.getByText('Target: ₹5,00,000.00')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Annual Vacation (Japan)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Target Date: Oct 2025')).toBeInTheDocument();
    expect(screen.getByText('57%')).toBeInTheDocument();
    expect(screen.getByText('₹85,000.00')).toBeInTheDocument();
    expect(screen.getByText('Target: ₹1,50,000.00')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Home Appliance Upgrades' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Replaced kitchen fixtures')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('₹40,000.00')).toBeInTheDocument();
    expect(screen.getByText('Target: ₹50,000.00')).toBeInTheDocument();
  });

  it('renders recent savings transactions', () => {
    render(<SavingsScreen />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent Savings Activity' }),
    ).toBeInTheDocument();

    expect(screen.getByText('18 Mar • Aarav')).toBeInTheDocument();
    expect(screen.getByText('+₹15,000.00')).toBeInTheDocument();

    expect(screen.getByText('Japan Trip')).toBeInTheDocument();
    expect(screen.getByText('10 Mar • Priya')).toBeInTheDocument();
    expect(screen.getByText('+₹10,000.00')).toBeInTheDocument();

    expect(screen.getByText('Home Appliance')).toBeInTheDocument();
    expect(screen.getByText('28 Feb • Vacuum repair')).toBeInTheDocument();
    expect(screen.getByText('-₹6,500.00')).toBeInTheDocument();
  });

  it('opens and closes action dialogs and help drawer', () => {
    render(<SavingsScreen />);

    // Open Deposit dialog
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Record Fund Deposit')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Toggle Help Drawer
    const helpButton = screen.getByRole('button', { name: 'Help and documentation' });
    fireEvent.click(helpButton);
    expect(screen.getByRole('region', { name: 'Savings policy guide' })).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(screen.queryByRole('region', { name: 'Savings policy guide' })).not.toBeInTheDocument();
  });
});

describe('Savings Calculations (PRD Section 4)', () => {
  it('calculates fund progress percentage properly', () => {
    expect(calculateFundProgress(22_000_000, 50_000_000)).toBe(44);
    expect(calculateFundProgress(8_500_000, 15_000_000)).toBe(57);
    expect(calculateFundProgress(0, 10_000_000)).toBe(0);
    expect(calculateFundProgress(12_000_000, 10_000_000)).toBe(100);
    expect(calculateFundProgress(5_000_000, 0)).toBe(0);
  });

  it('calculates total pooled savings while ignoring archived funds', () => {
    const funds: SavingsFund[] = [
      {
        id: '1',
        name: 'Fund 1',
        subtitle: 'Sub 1',
        icon: 'shield',
        balancePaise: 10_000_000,
        targetPaise: 20_000_000,
      },
      {
        id: '2',
        name: 'Fund 2',
        subtitle: 'Sub 2',
        icon: 'flight',
        balancePaise: 5_000_000,
        targetPaise: 10_000_000,
      },
      {
        id: '3',
        name: 'Fund 3 (Archived)',
        subtitle: 'Sub 3',
        icon: 'kitchen',
        balancePaise: 3_000_000,
        targetPaise: 5_000_000,
        isArchived: true,
      },
    ];

    expect(calculateTotalPooledSavings(funds)).toBe(15_000_000);
  });
});

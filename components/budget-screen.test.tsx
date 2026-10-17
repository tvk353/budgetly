import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetScreen } from './budget-screen';
import { calculateBudgetMetrics, type MonthBudgetData } from '@/lib/budget-data';

describe('BudgetScreen', () => {
  it('renders the header, workspace pill, and active Budget bottom navigation', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Monthly Budget' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /switch workspace, currently household with 2 members/i }),
    ).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('link', { name: 'Go back to Household dashboard' })).toHaveAttribute(
      'href',
      '/workspace/household',
    );

    const budgetNav = screen.getByRole('link', { name: 'Budget' });
    expect(budgetNav).toBeInTheDocument();
    expect(budgetNav).toHaveAttribute('href', '/budget');
    expect(budgetNav).toHaveAttribute('aria-current', 'page');
  });

  it('renders the approved financial formula, surplus card, and stat breakdown ledger', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    // Formula ledger
    expect(screen.getByText(/Formula:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Available Budget = Budget \+ Rollover − Net Eligible Expenses/),
    ).toBeInTheDocument();

    // Available surplus & pace
    expect(screen.getByText('Available Surplus')).toBeInTheDocument();
    expect(screen.getByText('₹23,450.00')).toBeInTheDocument();
    expect(screen.getByText('Healthy Pace')).toBeInTheDocument();
    expect(screen.getByText('64% utilized')).toBeInTheDocument();
    expect(screen.getByText('Target Cap: ₹65,000.00')).toBeInTheDocument();

    // Breakdown grid
    expect(screen.getByText('Base Budget')).toBeInTheDocument();
    expect(screen.getByText('₹60,000.00')).toBeInTheDocument();
    expect(screen.getByText('Rollover (Feb)')).toBeInTheDocument();
    expect(screen.getByText('+₹5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Total Applicable Budget')).toBeInTheDocument();
    expect(screen.getByText('₹65,000.00')).toBeInTheDocument();
    expect(screen.getByText('Gross Expenses')).toBeInTheDocument();
    expect(screen.getByText('₹43,800.00')).toBeInTheDocument();
    expect(screen.getByText('Received Refunds')).toBeInTheDocument();
    expect(screen.getByText('-₹2,250.00')).toBeInTheDocument();
    expect(screen.getByText('Net Eligible Expenses')).toBeInTheDocument();
    expect(screen.getByText('₹41,550.00')).toBeInTheDocument();
  });

  it('renders all 6 category envelopes with correct allocation caps and refund notices', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Category Envelopes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('6 tracked categories for household stewardship')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Groceries' })).toBeInTheDocument();
    expect(screen.getByText('Pantry & Provisions')).toBeInTheDocument();
    expect(screen.getAllByText('79% used')).toHaveLength(2);

    expect(screen.getByRole('heading', { level: 3, name: 'Dining Out' })).toBeInTheDocument();
    expect(screen.getByText('84% used')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Utilities & Bills' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Shopping & Retail' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Adj. by ₹1,450 refund')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Transport' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 3, name: 'Healthcare' })).toBeInTheDocument();
    expect(screen.getByText('0% used')).toBeInTheDocument();
  });

  it('allows navigating to past and future months with approved PRD rules', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    // Navigate to February 2025 (past month)
    const prevButton = screen.getByRole('button', { name: /previous month february 2025/i });
    fireEvent.click(prevButton);

    expect(screen.getByText('February 2025')).toBeInTheDocument();
    expect(screen.getByText('Past')).toBeInTheDocument();

    // Navigate back to March
    const nextButton = screen.getByRole('button', { name: /next month march 2025/i });
    fireEvent.click(nextButton);
    expect(screen.getByText('March 2025')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();

    // Navigate to April 2025 (future month)
    const aprButton = screen.getByRole('button', { name: /next month april 2025/i });
    fireEvent.click(aprButton);
    expect(screen.getByText(/No budget created for April 2025 yet/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Per approved policy, a new monthly budget can only be created during its active calendar month/,
      ),
    ).toBeInTheDocument();
  });

  it('opens and closes the edit allocation guidance modal', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    const editButton = screen.getByRole('button', { name: /edit budget allocation/i });
    fireEvent.click(editButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Edit Budget Allocation \(March 2025\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles the calculation guide help drawer', () => {
    render(<BudgetScreen initialMonthKey="2025-03" />);

    const helpButton = screen.getByRole('button', { name: 'Help and documentation' });
    fireEvent.click(helpButton);

    expect(screen.getByRole('region', { name: 'Budget calculation guide' })).toBeInTheDocument();
    expect(screen.getByText(/Monthly Budget Rules \(PRD Section 3\):/)).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(
      screen.queryByRole('region', { name: 'Budget calculation guide' }),
    ).not.toBeInTheDocument();
  });
});

describe('calculateBudgetMetrics (PRD Section 3 Rules)', () => {
  it('correctly calculates healthy surplus', () => {
    const data: MonthBudgetData = {
      monthKey: '2025-03',
      monthLabel: 'March 2025',
      shortLabel: 'Mar',
      isCurrentMonth: true,
      baseBudgetPaise: 6_000_000,
      rolloverPaise: 500_000,
      grossExpensesPaise: 4_380_000,
      receivedRefundsPaise: 225_000,
      envelopes: [],
    };

    const metrics = calculateBudgetMetrics(data);
    expect(metrics.applicableBudgetPaise).toBe(6_500_000);
    expect(metrics.netEligibleExpensesPaise).toBe(4_155_000);
    expect(metrics.availableBudgetPaise).toBe(2_345_000);
    expect(metrics.isOverspent).toBe(false);
    expect(metrics.utilizationPercent).toBe(64);
    expect(metrics.statusTag).toBe('Healthy Pace');
  });

  it('correctly identifies overspent / negative available budget', () => {
    const data: MonthBudgetData = {
      monthKey: '2025-03',
      monthLabel: 'March 2025',
      shortLabel: 'Mar',
      isCurrentMonth: true,
      baseBudgetPaise: 5_000_000,
      rolloverPaise: 0,
      grossExpensesPaise: 6_200_000,
      receivedRefundsPaise: 200_000,
      envelopes: [],
    };

    const metrics = calculateBudgetMetrics(data);
    expect(metrics.applicableBudgetPaise).toBe(5_000_000);
    expect(metrics.netEligibleExpensesPaise).toBe(6_000_000);
    expect(metrics.availableBudgetPaise).toBe(-1_000_000);
    expect(metrics.isOverspent).toBe(true);
    expect(metrics.statusTag).toBe('Over Budget');
    expect(metrics.statusDescription).toContain('Overspent by ₹10,000.00');
  });
});

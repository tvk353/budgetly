import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HouseholdDashboard } from './household-dashboard';
import { calculateBudgetSummary, getHouseholdDashboardData } from '@/lib/household-dashboard-data';

const standardBudget = {
  baseBudgetPaise: 6_000_000,
  rolloverPaise: 500_000,
  expensesPaise: 4_380_000,
  refundsPaise: 225_000,
  remainingDays: 7,
};

describe('calculateBudgetSummary', () => {
  it('calculates applicable budget, net spending, available balance, and daily safe spend', () => {
    const summary = calculateBudgetSummary(standardBudget);

    expect(summary.applicableBudgetPaise).toBe(6_500_000);
    expect(summary.netEligibleExpensesPaise).toBe(4_155_000);
    expect(summary.availableBudgetPaise).toBe(2_345_000);
    expect(summary.spendingPercent).toBeCloseTo(63.923, 2);
    expect(summary.progressRatio).toBeCloseTo(0.63923, 4);
    expect(summary.dailySafeSpendPaise).toBe(335_000);
  });

  it('subtracts refunds from net eligible expenses and increases available budget', () => {
    const withRefund = calculateBudgetSummary(standardBudget);
    const withoutRefund = calculateBudgetSummary({ ...standardBudget, refundsPaise: 0 });

    expect(withRefund.netEligibleExpensesPaise).toBe(
      withoutRefund.netEligibleExpensesPaise - standardBudget.refundsPaise,
    );
    expect(withRefund.availableBudgetPaise).toBe(
      withoutRefund.availableBudgetPaise + standardBudget.refundsPaise,
    );
  });

  it('allows overspending and caps the circular progress ratio safely', () => {
    const summary = calculateBudgetSummary({
      baseBudgetPaise: 1_000_000,
      rolloverPaise: 0,
      expensesPaise: 1_250_000,
      refundsPaise: 0,
      remainingDays: 5,
    });

    expect(summary.availableBudgetPaise).toBe(-250_000);
    expect(summary.overspentPaise).toBe(250_000);
    expect(summary.progressRatio).toBe(1);
    expect(summary.dailySafeSpendPaise).toBe(0);
  });

  it('handles a zero budget and month end without NaN or Infinity', () => {
    const summary = calculateBudgetSummary({
      baseBudgetPaise: 0,
      rolloverPaise: 0,
      expensesPaise: 0,
      refundsPaise: 0,
      remainingDays: 0,
    });

    expect(summary.spendingPercent).toBeNull();
    expect(summary.progressRatio).toBe(0);
    expect(summary.dailySafeSpendPaise).toBeNull();
    expect(
      [
        summary.applicableBudgetPaise,
        summary.netEligibleExpensesPaise,
        summary.availableBudgetPaise,
        summary.progressRatio,
      ].every(Number.isFinite),
    ).toBe(true);
  });
});

describe('HouseholdDashboard', () => {
  it('renders the main sections, primary metrics, recent transactions, and quick actions', () => {
    const dashboard = getHouseholdDashboardData(new Date('2026-10-16T05:30:00.000Z'));
    render(<HouseholdDashboard dashboard={dashboard} />);

    expect(screen.getByRole('heading', { name: /good morning, aarav/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /october 2026 budget/i })).toBeInTheDocument();
    expect(screen.getByText('Illustrative mock data')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /64% used; ₹23,450.00 available of ₹65,000.00/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('₹43,800.00')).toBeInTheDocument();
    expect(screen.getByText('+₹2,250.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Transactions' })).toBeInTheDocument();
    expect(screen.getByText("Nature's Basket Groceries")).toBeInTheDocument();
    expect(screen.getByText('Paid by Priya')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expense, not available yet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refund, not available yet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activity, not available yet' })).toBeDisabled();
  });

  it('provides an accessible workspace selector and marks only Home as current navigation', () => {
    const dashboard = getHouseholdDashboardData(new Date('2026-10-16T05:30:00.000Z'));
    render(<HouseholdDashboard dashboard={dashboard} />);

    expect(
      screen.getByRole('link', { name: 'Switch Household workspace, 2 members' }),
    ).toHaveAttribute('href', '/workspaces');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'href',
      '/transactions',
    );
    expect(screen.getByRole('link', { name: 'Budget' })).toHaveAttribute('href', '/budget');
    expect(screen.getByRole('link', { name: 'Savings' })).toHaveAttribute('href', '/savings');
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/more');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransactionsScreen } from './transactions-screen';
import { getTransactionScreenData } from '@/lib/transactions-data';

function renderTransactions() {
  const screenData = getTransactionScreenData(new Date('2026-10-16T05:30:00.000Z'));
  return render(
    <TransactionsScreen
      transactions={screenData.records}
      todayKey={screenData.todayKey}
      monthLabel={screenData.monthLabel}
      monthPrefix={screenData.monthPrefix}
      monthExpensePaise={screenData.monthExpensePaise}
      monthRefundPaise={screenData.monthRefundPaise}
      netSpentPaise={294_000}
      transactionCount={screenData.transactionCount}
    />,
  );
}

describe('TransactionsScreen', () => {
  it('renders the labeled mock ledger, INR row amounts, and active Transactions navigation', () => {
    renderTransactions();

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByText('ILLUSTRATIVE MOCK LEDGER')).toBeInTheDocument();
    expect(screen.getByText('October 2026 • 28 transactions')).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Nature's Basket Groceries, Groceries, ₹2,840.00/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /Amazon Return — Shoes, Shopping, ₹1,450.00/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'href',
      '/transactions',
    );
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/workspace/household',
    );
  });

  it('searches descriptions, category labels, and formatted amount digits', () => {
    renderTransactions();
    const search = screen.getByRole('searchbox', { name: 'Search transactions' });

    fireEvent.change(search, { target: { value: 'petrol' } });
    expect(screen.getByText('HP Petrol Pump')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy Food Delivery')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'Health' } });
    expect(screen.getByText('Apollo Pharmacy')).toBeInTheDocument();
    expect(screen.queryByText('HP Petrol Pump')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '1,500.00' } });
    expect(screen.getByText('HP Petrol Pump')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'no match' } });
    expect(screen.getByRole('status')).toHaveTextContent('No transactions match these filters.');
  });

  it('filters by expense and refund types', () => {
    renderTransactions();

    fireEvent.click(screen.getByRole('button', { name: /Refunds/ }));
    expect(screen.getByText('Amazon Return — Shoes')).toBeInTheDocument();
    expect(screen.queryByText('HP Petrol Pump')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Expenses/ }));
    expect(screen.getByText('HP Petrol Pump')).toBeInTheDocument();
    expect(screen.queryByText('Amazon Return — Shoes')).not.toBeInTheDocument();
  });

  it('filters by date range and category', () => {
    renderTransactions();

    expect(screen.queryByText('BookMyShow Movies')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: 'all-dates' } });
    expect(screen.getByText('BookMyShow Movies')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Shopping' } });

    expect(screen.getByText('Amazon Return — Shoes')).toBeInTheDocument();
    expect(screen.queryByText("Nature's Basket Groceries")).not.toBeInTheDocument();
  });
});

it('opens Add Expense, validates required fields, and adds a mock expense to the ledger', () => {
  renderTransactions();
  fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
  expect(screen.getByRole('dialog', { name: 'Add Expense' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Save Expense/ }));
  expect(screen.getByRole('alert')).toHaveTextContent(/amount greater than/i);

  fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
    target: { value: '123.45' },
  });
  fireEvent.change(screen.getByLabelText('Category *'), { target: { value: 'Groceries' } });
  fireEvent.change(screen.getByLabelText(/Label/), { target: { value: 'Amazon' } });
  fireEvent.change(screen.getByLabelText(/Description/), {
    target: { value: 'Test grocery purchase' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Save Expense/ }));

  expect(screen.queryByRole('dialog', { name: 'Add Expense' })).not.toBeInTheDocument();
  expect(screen.getByText('Test grocery purchase')).toBeInTheDocument();
  expect(
    screen.getByRole('article', { name: /Test grocery purchase, Groceries, ₹123\.45/ }),
  ).toBeInTheDocument();
});

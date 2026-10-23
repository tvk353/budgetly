import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AddRefundSheet } from './add-expense-sheet';
import type { RefundableExpense } from '@/lib/transactions-data';

const refundableExpenses: RefundableExpense[] = [
  {
    id: 'expense-shoes',
    description: 'Running shoes',
    amountPaise: 10_000,
    refundedPaise: 2_500,
    remainingPaise: 7_500,
    category: 'Shopping',
  },
];

function renderSheet() {
  const onSave = vi.fn();
  render(
    <AddRefundSheet
      todayKey="2026-10-16"
      refundableExpenses={refundableExpenses}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  return onSave;
}

describe('AddRefundSheet', () => {
  it('inherits a linked expense category and supports a full remaining refund', () => {
    const onSave = renderSheet();

    expect(screen.getByRole('dialog', { name: 'Add Refund' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Select expense *'), {
      target: { value: 'expense-shoes' },
    });
    expect(screen.getByLabelText(/Category/)).toHaveValue('Shopping');
    expect(screen.getByLabelText(/Category/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Refund Full Amount/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaise: 7_500,
        category: 'Shopping',
        linkedExpenseId: 'expense-shoes',
      }),
    );
  });

  it('rejects linked amounts above the remaining refundable amount', () => {
    const onSave = renderSheet();
    fireEvent.change(screen.getByLabelText('Select expense *'), {
      target: { value: 'expense-shoes' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '75.01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Refund cannot exceed the remaining');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires an explicit expense for linked refunds', () => {
    const onSave = renderSheet();
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '1.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose an expense');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires a category for unlinked refunds and saves reusable labels', () => {
    const onSave = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Unlinked Refund' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '12.34' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a category.');

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText(/Label/), { target: { value: 'Amazon' } });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Returned item' },
    });
    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: 'Refunded to UPI' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaise: 1_234,
        category: 'Groceries',
        label: 'Amazon',
        description: 'Returned item',
        notes: 'Refunded to UPI',
        linkedExpenseId: undefined,
      }),
    );
  });

  it('rejects future dates and malformed amounts', () => {
    const onSave = renderSheet();
    fireEvent.change(screen.getByLabelText('Select expense *'), {
      target: { value: 'expense-shoes' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '0.001' },
    });
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('');

    fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
      target: { value: '1.00' },
    });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-17' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Refund/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose today or an earlier date.');
    expect(onSave).not.toHaveBeenCalled();
  });
});

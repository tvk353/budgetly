import { describe, expect, it } from 'vitest';

import {
  getRefundableExpenses,
  parseInrAmountToPaise,
  type DatedMockTransaction,
} from './transactions-data';

describe('refund transaction data', () => {
  it('parses valid INR amounts directly to integer paise', () => {
    expect(parseInrAmountToPaise('125')).toBe(12_500);
    expect(parseInrAmountToPaise('0.01')).toBe(1);
    expect(parseInrAmountToPaise('12.3')).toBe(1_230);
    expect(parseInrAmountToPaise('12.345')).toBeNull();
    expect(parseInrAmountToPaise('0')).toBeNull();
    expect(parseInrAmountToPaise('01.00')).toBe(100);
  });

  it('calculates remaining refundable amounts from linked refunds only', () => {
    const records = [
      {
        id: 'expense',
        description: 'Shoes',
        amountPaise: 10_000,
        type: 'expense',
        date: '2026-10-10',
        dateLabel: '10 Oct 2026',
        dayGroup: '10 Oct 2026',
        category: 'Shopping',
        icon: 'cart',
      },
      {
        id: 'linked-refund',
        description: 'Partial return',
        amountPaise: 3_250,
        type: 'refund',
        date: '2026-10-12',
        dateLabel: '12 Oct 2026',
        dayGroup: '12 Oct 2026',
        category: 'Shopping',
        linkedExpenseId: 'expense',
        icon: 'refund',
      },
      {
        id: 'unlinked-refund',
        description: 'Other refund',
        amountPaise: 900,
        type: 'refund',
        date: '2026-10-12',
        dateLabel: '12 Oct 2026',
        dayGroup: '12 Oct 2026',
        category: 'Groceries',
        icon: 'refund',
      },
    ] satisfies DatedMockTransaction[];

    expect(getRefundableExpenses(records)).toEqual([
      {
        id: 'expense',
        description: 'Shoes',
        amountPaise: 10_000,
        refundedPaise: 3_250,
        remainingPaise: 6_750,
        category: 'Shopping',
      },
    ]);
  });
});

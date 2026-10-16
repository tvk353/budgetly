import {
  calculateBudgetSummary,
  formatInrPaise,
  householdDashboardMock,
} from '@/lib/household-dashboard-data';

export type TransactionKind = 'expense' | 'refund';
export type TransactionTypeFilter = 'all' | TransactionKind;
export type TransactionPeriodFilter = 'this-month' | 'all-dates';

export interface MockTransaction {
  id: string;
  description: string;
  amountPaise: number;
  type: TransactionKind;
  date: string;
  time?: string;
  category: string;
  payer?: string;
  detail?: string;
  icon: 'cart' | 'gas' | 'dining' | 'refund' | 'bolt' | 'medicine' | 'movie';
}

export interface DatedMockTransaction extends MockTransaction {
  dateLabel: string;
  dayGroup: string;
}

export interface TransactionFilters {
  query: string;
  type: TransactionTypeFilter;
  period: TransactionPeriodFilter;
  category: string;
}

export const mockTransactionRecords = [
  {
    id: 'groceries',
    description: "Nature's Basket Groceries",
    amountPaise: 284_000,
    type: 'expense',
    dayOffset: 0,
    time: '10:30 AM',
    category: 'Groceries',
    payer: 'Priya',
    icon: 'cart',
  },
  {
    id: 'petrol',
    description: 'HP Petrol Pump',
    amountPaise: 150_000,
    type: 'expense',
    dayOffset: 0,
    time: '08:15 AM',
    category: 'Transport',
    payer: 'Aarav',
    icon: 'gas',
  },
  {
    id: 'dinner',
    description: 'Swiggy Food Delivery',
    amountPaise: 92_000,
    type: 'expense',
    dayOffset: 1,
    time: '08:45 PM',
    category: 'Dining',
    payer: 'Aarav',
    icon: 'dining',
  },
  {
    id: 'amazon-refund',
    description: 'Amazon Return — Shoes',
    amountPaise: 145_000,
    type: 'refund',
    dayOffset: 1,
    time: '03:15 PM',
    category: 'Shopping',
    detail: 'Linked Refund',
    icon: 'refund',
  },
  {
    id: 'electricity',
    description: 'Tata Power Electricity',
    amountPaise: 321_000,
    type: 'expense',
    dayOffset: 4,
    category: 'Utilities',
    detail: 'Auto-debit • Shared',
    icon: 'bolt',
  },
  {
    id: 'pharmacy',
    description: 'Apollo Pharmacy',
    amountPaise: 68_000,
    type: 'expense',
    dayOffset: 4,
    category: 'Health',
    payer: 'Priya',
    icon: 'medicine',
  },
  {
    id: 'movies',
    description: 'BookMyShow Movies',
    amountPaise: 110_000,
    type: 'expense',
    dayOffset: 220,
    category: 'Entertainment',
    payer: 'Aarav',
    icon: 'movie',
  },
] satisfies Array<Omit<MockTransaction, 'date' | 'dateLabel' | 'dayGroup'> & { dayOffset: number }>;

export const transactionScreenMockCount = 28;

const istDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateLabelFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const monthLabelFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'long',
  year: 'numeric',
});

export function getIstDateKey(date: Date) {
  const parts = istDateParts.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - dayOffset));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function dateAtIstNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+05:30`);
}

export function getTransactionScreenData(now: Date) {
  const todayKey = getIstDateKey(now);
  const [year, month] = todayKey.split('-');
  const monthPrefix = `${year}-${month}-`;

  return {
    todayKey,
    monthKey: `${year}-${month}`,
    monthLabel: monthLabelFormat.format(now),
    monthExpensePaise: householdDashboardMock.budget.expensesPaise,
    monthRefundPaise: householdDashboardMock.budget.refundsPaise,
    netSpentPaise: calculateBudgetSummary({
      ...householdDashboardMock.budget,
      remainingDays: 0,
    }).netEligibleExpensesPaise,
    transactionCount: transactionScreenMockCount,
    records: mockTransactionRecords
      .map(({ dayOffset, ...transaction }) => {
        const date = shiftDateKey(todayKey, dayOffset);
        const dayGroup =
          dayOffset === 0
            ? 'Today'
            : dayOffset === 1
              ? 'Yesterday'
              : dateLabelFormat.format(dateAtIstNoon(date));

        return {
          ...transaction,
          date,
          dateLabel: dateLabelFormat.format(dateAtIstNoon(date)),
          dayGroup,
        };
      })
      .sort((first, second) => second.date.localeCompare(first.date)),
    monthPrefix,
  };
}

export function filterTransactions(
  records: DatedMockTransaction[],
  filters: TransactionFilters,
  monthPrefix: string,
) {
  const query = filters.query.trim().toLocaleLowerCase('en-IN');
  const normalizedQuery = query.replace(/[₹,\s]/g, '');

  return records.filter((transaction) => {
    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.period === 'this-month' && !transaction.date.startsWith(monthPrefix)) return false;
    if (filters.category !== 'all' && transaction.category !== filters.category) return false;

    if (!query) return true;

    const searchableText = [
      transaction.description,
      transaction.category,
      transaction.payer,
      transaction.detail,
      formatInrPaise(transaction.amountPaise),
      (transaction.amountPaise / 100).toFixed(2),
      (transaction.amountPaise / 100).toFixed(0),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('en-IN');
    const normalizedText = searchableText.replace(/[₹,\s]/g, '');

    return searchableText.includes(query) || normalizedText.includes(normalizedQuery);
  });
}

export function groupTransactionsByDay(records: DatedMockTransaction[]) {
  return records.reduce<Array<{ label: string; date: string; records: DatedMockTransaction[] }>>(
    (groups, transaction) => {
      const lastGroup = groups.at(-1);
      if (lastGroup?.date === transaction.date) {
        lastGroup.records.push(transaction);
      } else {
        groups.push({
          label: transaction.dayGroup,
          date: transaction.date,
          records: [transaction],
        });
      }
      return groups;
    },
    [],
  );
}

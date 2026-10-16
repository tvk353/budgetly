export interface BudgetInputs {
  baseBudgetPaise: number;
  rolloverPaise: number;
  expensesPaise: number;
  refundsPaise: number;
  remainingDays: number;
}

export interface BudgetSummary {
  applicableBudgetPaise: number;
  netEligibleExpensesPaise: number;
  availableBudgetPaise: number;
  spendingPercent: number | null;
  progressRatio: number;
  dailySafeSpendPaise: number | null;
  overspentPaise: number;
}

export interface RecentTransaction {
  id: string;
  description: string;
  amountPaise: number;
  type: 'expense' | 'refund';
  category: string;
  icon: 'cart' | 'dining' | 'refund' | 'utility';
  dateOffsetDays: number;
  time?: string;
  payer?: string;
  relationship?: string;
}

export interface HouseholdDashboardData {
  displayName: string;
  memberCount: number;
  dateLabel: string;
  monthLabel: string;
  periodLabel: string;
  greeting: string;
  remainingDays: number;
  expensesPaise: number;
  refundsPaise: number;
  refundCount: number;
  budget: BudgetSummary;
  recentTransactions: Array<RecentTransaction & { dateLabel: string }>;
}

export const householdDashboardMock = {
  displayName: 'Aarav',
  memberCount: 2,
  budget: {
    baseBudgetPaise: 6_000_000,
    rolloverPaise: 500_000,
    expensesPaise: 4_380_000,
    refundsPaise: 225_000,
    refundCount: 2,
  },
  recentTransactions: [
    {
      id: 'groceries',
      description: "Nature's Basket Groceries",
      amountPaise: 284_000,
      type: 'expense',
      category: 'Groceries',
      icon: 'cart',
      dateOffsetDays: 0,
      time: '10:30 AM',
      payer: 'Priya',
    },
    {
      id: 'dinner',
      description: 'Swiggy Dinner',
      amountPaise: 92_000,
      type: 'expense',
      category: 'Dining',
      icon: 'dining',
      dateOffsetDays: 1,
      payer: 'Aarav',
    },
    {
      id: 'amazon-refund',
      description: 'Amazon Return Refund',
      amountPaise: 145_000,
      type: 'refund',
      category: 'Refund',
      icon: 'refund',
      dateOffsetDays: 2,
      relationship: 'Linked to Amazon',
    },
    {
      id: 'electricity',
      description: 'Tata Power Electricity',
      amountPaise: 321_000,
      type: 'expense',
      category: 'Utilities',
      icon: 'utility',
      dateOffsetDays: 4,
      relationship: 'Shared bill',
    },
  ],
} satisfies {
  displayName: string;
  memberCount: number;
  budget: Omit<BudgetInputs, 'remainingDays'> & { refundCount: number };
  recentTransactions: RecentTransaction[];
};

const istDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istDateLabel = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

const transactionDateLabel = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
});

const monthLabelFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'long',
  year: 'numeric',
});

const monthShortFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
});

function getIstDateParts(date: Date) {
  const parts = istDateParts.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';

  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
  };
}

function getIstHour(date: Date) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
}

function dateStringAtIstNoon(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+05:30`;
}

function getTransactionDateLabel(date: Date, offsetDays: number, time?: string) {
  if (offsetDays === 0) return time ? `Today, ${time}` : 'Today';
  if (offsetDays === 1) return 'Yesterday';

  const { year, month, day } = getIstDateParts(date);
  const dateAtIstNoon = new Date(dateStringAtIstNoon(year, month, day));
  dateAtIstNoon.setUTCDate(dateAtIstNoon.getUTCDate() - offsetDays);
  return transactionDateLabel.format(dateAtIstNoon);
}

export function calculateBudgetSummary({
  baseBudgetPaise,
  rolloverPaise,
  expensesPaise,
  refundsPaise,
  remainingDays,
}: BudgetInputs): BudgetSummary {
  const applicableBudgetPaise = baseBudgetPaise + rolloverPaise;
  const netEligibleExpensesPaise = expensesPaise - refundsPaise;
  const availableBudgetPaise = applicableBudgetPaise - netEligibleExpensesPaise;
  const spendingPercent =
    applicableBudgetPaise > 0 ? (netEligibleExpensesPaise / applicableBudgetPaise) * 100 : null;
  const progressRatio =
    spendingPercent === null
      ? netEligibleExpensesPaise > 0
        ? 1
        : 0
      : Math.min(Math.max(spendingPercent / 100, 0), 1);
  const dailySafeSpendPaise =
    remainingDays > 0 && availableBudgetPaise > 0
      ? Math.round(availableBudgetPaise / remainingDays)
      : remainingDays > 0
        ? 0
        : null;

  return {
    applicableBudgetPaise,
    netEligibleExpensesPaise,
    availableBudgetPaise,
    spendingPercent,
    progressRatio,
    dailySafeSpendPaise,
    overspentPaise: Math.max(-availableBudgetPaise, 0),
  };
}

export function formatInrPaise(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}

export function getHouseholdDashboardData(now: Date): HouseholdDashboardData {
  const { year, month, day } = getIstDateParts(now);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = daysInMonth - day;
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const monthName = monthLabelFormat.format(now);
  const greetingHour = getIstHour(now);
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return {
    displayName: householdDashboardMock.displayName,
    memberCount: householdDashboardMock.memberCount,
    dateLabel: istDateLabel.format(now),
    monthLabel: monthName,
    periodLabel: `${monthShortFormat.format(firstDay)} 1 - ${monthShortFormat.format(now)} ${day}`,
    greeting,
    remainingDays,
    expensesPaise: householdDashboardMock.budget.expensesPaise,
    refundsPaise: householdDashboardMock.budget.refundsPaise,
    refundCount: householdDashboardMock.budget.refundCount,
    budget: calculateBudgetSummary({
      ...householdDashboardMock.budget,
      remainingDays,
    }),
    recentTransactions: householdDashboardMock.recentTransactions.map((transaction) => ({
      ...transaction,
      dateLabel: getTransactionDateLabel(now, transaction.dateOffsetDays, transaction.time),
    })),
  };
}

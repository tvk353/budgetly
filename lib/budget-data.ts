import { formatInrPaise } from '@/lib/household-dashboard-data';
import type { DashboardIconName } from '@/components/dashboard-icon';

export interface CategoryEnvelope {
  id: string;
  name: string;
  subtitle: string;
  icon: DashboardIconName;
  allocatedPaise: number;
  spentPaise: number;
  refundNote?: string;
}

export interface MonthBudgetData {
  monthKey: string;
  monthLabel: string;
  shortLabel: string;
  isCurrentMonth: boolean;
  baseBudgetPaise: number;
  rolloverPaise: number;
  rolloverMonthLabel?: string;
  grossExpensesPaise: number;
  receivedRefundsPaise: number;
  envelopes: CategoryEnvelope[];
}

export interface BudgetCalculations {
  applicableBudgetPaise: number;
  netEligibleExpensesPaise: number;
  availableBudgetPaise: number;
  isOverspent: boolean;
  utilizationPercent: number;
  progressRatio: number;
  statusTag: string;
  statusDescription: string;
}

export function calculateBudgetMetrics(data: MonthBudgetData): BudgetCalculations {
  const applicableBudgetPaise = Math.max(0, data.baseBudgetPaise + Math.max(0, data.rolloverPaise));
  const netEligibleExpensesPaise = data.grossExpensesPaise - data.receivedRefundsPaise;
  const availableBudgetPaise = applicableBudgetPaise - netEligibleExpensesPaise;
  const isOverspent = availableBudgetPaise < 0;

  const utilizationPercent =
    applicableBudgetPaise > 0
      ? Math.round((netEligibleExpensesPaise / applicableBudgetPaise) * 100)
      : netEligibleExpensesPaise > 0
        ? 100
        : 0;

  const progressRatio =
    applicableBudgetPaise > 0
      ? Math.min(Math.max(netEligibleExpensesPaise / applicableBudgetPaise, 0), 1)
      : netEligibleExpensesPaise > 0
        ? 1
        : 0;

  let statusTag = 'Healthy Pace';
  let statusDescription = 'Ready for savings or discretionary spend';

  if (isOverspent) {
    statusTag = 'Over Budget';
    statusDescription = `Overspent by ${formatInrPaise(Math.abs(availableBudgetPaise))}`;
  } else if (utilizationPercent >= 85) {
    statusTag = 'Attention Needed';
    statusDescription = 'Approaching monthly cap';
  }

  return {
    applicableBudgetPaise,
    netEligibleExpensesPaise,
    availableBudgetPaise,
    isOverspent,
    utilizationPercent,
    progressRatio,
    statusTag,
    statusDescription,
  };
}

export function formatWholeInr(amountPaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

export const mockBudgetData: Record<string, MonthBudgetData> = {
  '2025-02': {
    monthKey: '2025-02',
    monthLabel: 'February 2025',
    shortLabel: 'Feb',
    isCurrentMonth: false,
    baseBudgetPaise: 6_000_000,
    rolloverPaise: 0,
    grossExpensesPaise: 56_200_00,
    receivedRefundsPaise: 1_200_00,
    envelopes: [
      {
        id: 'groceries',
        name: 'Groceries',
        subtitle: 'Pantry & Provisions',
        icon: 'cart',
        allocatedPaise: 18_000_00,
        spentPaise: 17_500_00,
      },
      {
        id: 'dining',
        name: 'Dining Out',
        subtitle: 'Cafes & Takeaways',
        icon: 'dining',
        allocatedPaise: 10_000_00,
        spentPaise: 9_800_00,
      },
      {
        id: 'utilities',
        name: 'Utilities & Bills',
        subtitle: 'Power, Fiber & Gas',
        icon: 'bolt',
        allocatedPaise: 12_000_00,
        spentPaise: 11_400_00,
      },
      {
        id: 'shopping',
        name: 'Shopping & Retail',
        subtitle: 'Clothing & Goods',
        icon: 'shopping-bag',
        allocatedPaise: 10_000_00,
        spentPaise: 8_500_00,
      },
      {
        id: 'transport',
        name: 'Transport',
        subtitle: 'Fuel, Metro & Cabs',
        icon: 'commute',
        allocatedPaise: 6_000_00,
        spentPaise: 5_200_00,
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        subtitle: 'Consults & Pharmacy',
        icon: 'medicine',
        allocatedPaise: 4_000_00,
        spentPaise: 2_600_00,
      },
    ],
  },
  '2025-03': {
    monthKey: '2025-03',
    monthLabel: 'March 2025',
    shortLabel: 'Mar',
    isCurrentMonth: true,
    baseBudgetPaise: 6_000_000,
    rolloverPaise: 500_000,
    rolloverMonthLabel: 'Feb',
    grossExpensesPaise: 4_380_000,
    receivedRefundsPaise: 225_000,
    envelopes: [
      {
        id: 'groceries',
        name: 'Groceries',
        subtitle: 'Pantry & Provisions',
        icon: 'cart',
        allocatedPaise: 1_800_000,
        spentPaise: 1_420_000,
      },
      {
        id: 'dining',
        name: 'Dining Out',
        subtitle: 'Cafes & Takeaways',
        icon: 'dining',
        allocatedPaise: 1_000_000,
        spentPaise: 840_000,
      },
      {
        id: 'utilities',
        name: 'Utilities & Bills',
        subtitle: 'Power, Fiber & Gas',
        icon: 'bolt',
        allocatedPaise: 1_200_000,
        spentPaise: 950_000,
      },
      {
        id: 'shopping',
        name: 'Shopping & Retail',
        subtitle: 'Clothing & Goods',
        icon: 'shopping-bag',
        allocatedPaise: 1_500_000,
        spentPaise: 560_000,
        refundNote: 'Adj. by ₹1,450 refund',
      },
      {
        id: 'transport',
        name: 'Transport',
        subtitle: 'Fuel, Metro & Cabs',
        icon: 'commute',
        allocatedPaise: 600_000,
        spentPaise: 385_000,
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        subtitle: 'Consults & Pharmacy',
        icon: 'medicine',
        allocatedPaise: 400_000,
        spentPaise: 0,
      },
    ],
  },
  '2025-04': {
    monthKey: '2025-04',
    monthLabel: 'April 2025',
    shortLabel: 'Apr',
    isCurrentMonth: false,
    baseBudgetPaise: 6_000_000,
    rolloverPaise: 0,
    grossExpensesPaise: 0,
    receivedRefundsPaise: 0,
    envelopes: [],
  },
};

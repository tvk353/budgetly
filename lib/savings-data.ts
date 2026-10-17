import type { DashboardIconName } from '@/components/dashboard-icon';

export interface SavingsFund {
  id: string;
  name: string;
  subtitle: string;
  icon: DashboardIconName;
  balancePaise: number;
  targetPaise: number;
  targetDateLabel?: string;
  isArchived?: boolean;
}

export type SavingsTransactionType = 'deposit' | 'withdrawal';

export interface SavingsActivity {
  id: string;
  fundId: string;
  fundName: string;
  type: SavingsTransactionType;
  amountPaise: number;
  dateLabel: string;
  actor?: string;
  detail?: string;
}

export interface SavingsDashboardData {
  totalPooledPaise: number;
  monthNetChangePaise: number;
  monthGrowthPercentage: number;
  funds: SavingsFund[];
  recentActivities: SavingsActivity[];
}

export function calculateFundProgress(balancePaise: number, targetPaise: number): number {
  if (targetPaise <= 0) return 0;
  return Math.min(Math.max(Math.round((balancePaise / targetPaise) * 100), 0), 100);
}

export function calculateTotalPooledSavings(funds: SavingsFund[]): number {
  return funds
    .filter((fund) => !fund.isArchived)
    .reduce((total, fund) => total + fund.balancePaise, 0);
}

export const mockSavingsData: SavingsDashboardData = {
  totalPooledPaise: 34_500_000, // ₹3,45,000.00
  monthNetChangePaise: 2_500_000, // +₹25,000.00
  monthGrowthPercentage: 7.8, // +7.8%
  funds: [
    {
      id: 'emergency-fund',
      name: 'Emergency Fund',
      subtitle: '6 months household buffer',
      icon: 'shield',
      balancePaise: 22_000_000, // ₹2,20,000.00
      targetPaise: 50_000_000, // ₹5,00,000.00
    },
    {
      id: 'annual-vacation',
      name: 'Annual Vacation (Japan)',
      subtitle: 'Target Date: Oct 2025',
      targetDateLabel: 'Oct 2025',
      icon: 'flight',
      balancePaise: 8_500_000, // ₹85,000.00
      targetPaise: 15_000_000, // ₹1,50,000.00
    },
    {
      id: 'home-appliance',
      name: 'Home Appliance Upgrades',
      subtitle: 'Replaced kitchen fixtures',
      icon: 'kitchen',
      balancePaise: 4_000_000, // ₹40,000.00
      targetPaise: 5_000_000, // ₹50,000.00
    },
  ],
  recentActivities: [
    {
      id: 'act-1',
      fundId: 'emergency-fund',
      fundName: 'Emergency Fund',
      type: 'deposit',
      amountPaise: 1_500_000, // ₹15,000.00
      dateLabel: '18 Mar',
      actor: 'Aarav',
    },
    {
      id: 'act-2',
      fundId: 'annual-vacation',
      fundName: 'Japan Trip',
      type: 'deposit',
      amountPaise: 1_000_000, // ₹10,000.00
      dateLabel: '10 Mar',
      actor: 'Priya',
    },
    {
      id: 'act-3',
      fundId: 'home-appliance',
      fundName: 'Home Appliance',
      type: 'withdrawal',
      amountPaise: 650_000, // ₹6,500.00
      dateLabel: '28 Feb',
      detail: 'Vacuum repair',
    },
  ],
};


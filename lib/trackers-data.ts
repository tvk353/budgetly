import type { DashboardIconName } from '@/components/dashboard-icon';

export type TrackerStatus = 'active' | 'ended' | 'hidden';

export interface TrackerExpenseChip {
  label: string;
  amountPaise: number;
}

export interface Tracker {
  id: string;
  name: string;
  icon: DashboardIconName;
  status: TrackerStatus;
  /** Total gross expenses in paise */
  grossExpensesPaise: number;
  /** Total refunds in paise */
  totalRefundsPaise: number;
  /** Optional spending cap in paise (PRD: not required) */
  capPaise?: number;
  transactionCount: number;
  isHousehold: boolean;
  /** Recent expense chips shown on card (active trackers only) */
  recentChips?: TrackerExpenseChip[];
  /** Label shown for ended trackers (e.g. "Mar 2024") */
  endedLabel?: string;
}

/** Net spending = Gross Expenses - Refunds */
export function calculateNetSpending(tracker: Tracker): number {
  return tracker.grossExpensesPaise - tracker.totalRefundsPaise;
}

/** Remaining cap = Cap - Net Spending. Returns null when no cap set. */
export function calculateRemainingCap(tracker: Tracker): number | null {
  if (tracker.capPaise == null) return null;
  return tracker.capPaise - calculateNetSpending(tracker);
}

/** Utilization % relative to cap (0–100). Returns null when no cap set. */
export function calculateUtilizationPct(tracker: Tracker): number | null {
  if (tracker.capPaise == null || tracker.capPaise <= 0) return null;
  const net = calculateNetSpending(tracker);
  return Math.min(Math.max(Math.round((net / tracker.capPaise) * 100), 0), 100);
}

export const mockTrackers: Tracker[] = [
  // ── Active trackers ─────────────────────────────────────────────────────
  {
    id: 'goa-vacation-2025',
    name: 'Goa Family Vacation 2025',
    icon: 'flight',
    status: 'active',
    grossExpensesPaise: 2_485_000, // ₹24,850.00
    totalRefundsPaise: 0,
    capPaise: 6_000_000, // ₹60,000.00
    transactionCount: 8,
    isHousehold: true,
    recentChips: [
      { label: 'Flights', amountPaise: 1_420_000 },
      { label: 'Airbnb advance', amountPaise: 800_000 },
    ],
  },
  {
    id: 'kitchen-renovation',
    name: 'Kitchen Renovation & Cookware',
    icon: 'kitchen',
    status: 'active',
    grossExpensesPaise: 3_820_000, // ₹38,200.00
    totalRefundsPaise: 0,
    capPaise: 4_500_000, // ₹45,000.00
    transactionCount: 5,
    isHousehold: true,
    recentChips: [
      { label: 'Chimney', amountPaise: 1_200_000 },
      { label: 'Sink & faucet', amountPaise: 650_000 },
    ],
  },
  // ── Ended tracker ───────────────────────────────────────────────────────
  {
    id: 'diwali-shopping-2024',
    name: 'Diwali Shopping 2024',
    icon: 'shopping-bag',
    status: 'ended',
    grossExpensesPaise: 3_240_000, // ₹32,400.00
    totalRefundsPaise: 0,
    capPaise: 3_500_000, // ₹35,000.00
    transactionCount: 12,
    isHousehold: true,
    endedLabel: 'Oct 2024',
  },
];

export function groupTrackers(trackers: Tracker[]): {
  active: Tracker[];
  ended: Tracker[];
  hidden: Tracker[];
} {
  return {
    active: trackers.filter((t) => t.status === 'active'),
    ended: trackers.filter((t) => t.status === 'ended'),
    hidden: trackers.filter((t) => t.status === 'hidden'),
  };
}

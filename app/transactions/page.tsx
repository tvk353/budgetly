import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { TransactionsScreen } from '@/components/transactions-screen';
import { getHouseholdDashboardData } from '@/lib/household-dashboard-data';
import { getTransactionScreenData } from '@/lib/transactions-data';

export default async function TransactionsPage() {
  await connection();
  const { workspace } = await requireWorkspacePage('household');
  const now = new Date();
  const screen = getTransactionScreenData(now);
  const dashboard = getHouseholdDashboardData(now);

  return (
    <TransactionsScreen
      key={workspace.id}
      workspaceName={workspace.name}
      transactions={screen.records}
      todayKey={screen.todayKey}
      monthLabel={screen.monthLabel}
      monthPrefix={screen.monthPrefix}
      monthExpensePaise={screen.monthExpensePaise}
      monthRefundPaise={screen.monthRefundPaise}
      netSpentPaise={dashboard.budget.netEligibleExpensesPaise}
      transactionCount={screen.transactionCount}
    />
  );
}

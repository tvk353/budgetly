import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { BudgetScreen } from '@/components/budget-screen';

export default async function BudgetPage() {
  await connection();
  const { workspace } = await requireWorkspacePage('household');

  return (
    <BudgetScreen key={workspace.id} initialMonthKey="2025-03" workspaceName={workspace.name} />
  );
}

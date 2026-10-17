import { connection } from 'next/server';

import { BudgetScreen } from '@/components/budget-screen';

export default async function BudgetPage() {
  await connection();

  return <BudgetScreen initialMonthKey="2025-03" />;
}

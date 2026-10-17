import { connection } from 'next/server';

import { SavingsScreen } from '@/components/savings-screen';

export default async function SavingsPage() {
  await connection();

  return <SavingsScreen />;
}


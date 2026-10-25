import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { SavingsScreen } from '@/components/savings-screen';

export default async function SavingsPage() {
  await connection();
  const { workspace } = await requireWorkspacePage('household');

  return <SavingsScreen key={workspace.id} workspaceName={workspace.name} />;
}

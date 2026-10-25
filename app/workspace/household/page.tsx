import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { HouseholdDashboard } from '@/components/household-dashboard';
import { getHouseholdDashboardData } from '@/lib/household-dashboard-data';

export default async function HouseholdWorkspacePage() {
  await connection();
  const { workspace } = await requireWorkspacePage('household');
  const dashboard = getHouseholdDashboardData(new Date());

  return (
    <HouseholdDashboard key={workspace.id} dashboard={dashboard} workspaceName={workspace.name} />
  );
}

import { connection } from 'next/server';

import { HouseholdDashboard } from '@/components/household-dashboard';
import { getHouseholdDashboardData } from '@/lib/household-dashboard-data';

export default async function HouseholdWorkspacePage() {
  await connection();
  const dashboard = getHouseholdDashboardData(new Date());

  return <HouseholdDashboard dashboard={dashboard} />;
}

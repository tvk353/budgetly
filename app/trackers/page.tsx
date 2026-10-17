import { connection } from 'next/server';

import { TrackersScreen } from '@/components/trackers-screen';

export default async function TrackersPage() {
  await connection();

  return <TrackersScreen />;
}

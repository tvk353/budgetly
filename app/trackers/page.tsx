import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { TrackersScreen } from '@/components/trackers-screen';

export default async function TrackersPage() {
  await connection();
  const { workspace } = await requireWorkspacePage('household');

  return <TrackersScreen key={workspace.id} workspaceName={workspace.name} />;
}

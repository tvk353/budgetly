import { connection } from 'next/server';
import { requireWorkspacePage } from '@/lib/auth/pages';

import { MoreHubScreen } from '@/components/more-hub-screen';

export default async function MorePage() {
  await connection();
  const { workspace } = await requireWorkspacePage();

  return (
    <MoreHubScreen
      key={workspace.id}
      workspaceName={workspace.name}
      workspaceType={workspace.type}
    />
  );
}

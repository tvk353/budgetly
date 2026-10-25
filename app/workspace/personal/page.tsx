import { AppShell } from '@/components/app-shell';
import { WorkspacePlaceholder } from '@/components/workspace-placeholder';
import { requireWorkspacePage } from '@/lib/auth/pages';

export default async function PersonalWorkspacePage() {
  const { workspace } = await requireWorkspacePage('personal');
  return (
    <AppShell>
      <WorkspacePlaceholder workspace="personal" name={workspace.name} />
    </AppShell>
  );
}

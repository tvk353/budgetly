import { AppShell } from '@/components/app-shell';
import { WorkspaceSelection } from '@/components/workspace-selection';
import { requirePageSession } from '@/lib/auth/pages';

export default async function WorkspacesPage() {
  await requirePageSession();
  return (
    <AppShell>
      <WorkspaceSelection />
    </AppShell>
  );
}

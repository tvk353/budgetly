import { AppShell } from '@/components/app-shell';
import { WorkspaceSelection } from '@/components/workspace-selection';

export default function WorkspacesPage() {
  return (
    <AppShell>
      <WorkspaceSelection />
    </AppShell>
  );
}

import { AppShell } from '@/components/app-shell';
import { WorkspacePlaceholder } from '@/components/workspace-placeholder';

export default function PersonalWorkspacePage() {
  return (
    <AppShell>
      <WorkspacePlaceholder workspace="personal" />
    </AppShell>
  );
}

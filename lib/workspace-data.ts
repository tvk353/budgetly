import type { Database } from '@/lib/supabase/database.types';

export type Workspace = Pick<
  Database['public']['Tables']['workspaces']['Row'],
  'id' | 'name' | 'type' | 'created_at'
>;

export const selectedWorkspaceCookie = 'budgetly-workspace';

export function getDefaultWorkspace(workspaces: Workspace[]) {
  return workspaces.find((workspace) => workspace.type === 'household') ?? workspaces[0];
}

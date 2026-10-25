import 'server-only';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ApiError } from '@/lib/api/errors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/supabase/session';
import { getDefaultWorkspaceForSession, getWorkspace } from '@/lib/workspaces';
import { selectedWorkspaceCookie } from '@/lib/workspace-data';

export async function requirePageSession() {
  const client = await createServerSupabaseClient({ readOnly: true });
  let session;
  try {
    session = await requireSession(client);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/');
    throw error;
  }
  return session;
}

export async function requireWorkspacePage(type?: 'personal' | 'household') {
  const session = await requirePageSession();
  const workspaceId = (await cookies()).get(selectedWorkspaceCookie)?.value;
  let workspace = null;
  if (workspaceId) {
    try {
      workspace = await getWorkspace(workspaceId, session);
    } catch (error) {
      // Stale/tampered preferences must never silently switch into another workspace.
      if (error instanceof ApiError && error.status === 404) redirect('/workspaces');
      throw error;
    }
  }
  if (!workspace || (type && workspace.type !== type)) {
    workspace = await getDefaultWorkspaceForSession(session, type);
  }
  if (!workspace) redirect('/workspaces');
  return { ...session, workspace };
}

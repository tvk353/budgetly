import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/errors';
import { readAuthBody } from '@/lib/auth/server';
import { getWorkspace } from '@/lib/workspaces';
import { selectedWorkspaceCookie } from '@/lib/workspace-data';

export async function POST(request: NextRequest) {
  try {
    const { workspace_id } = await readAuthBody(request, ['workspace_id']);
    const workspace = await getWorkspace(workspace_id);
    const store = await cookies();
    store.set(selectedWorkspaceCookie, workspace.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: new URL(process.env.APP_ORIGIN ?? request.url).protocol === 'https:',
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json(workspace, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { getWorkspace } from '@/lib/workspaces';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    return NextResponse.json(await getWorkspace(workspaceId), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

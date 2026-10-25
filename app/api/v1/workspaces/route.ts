import { NextRequest, NextResponse } from 'next/server';

import { apiErrorResponse } from '@/lib/api/errors';
import { listWorkspaces } from '@/lib/workspaces';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await listWorkspaces(request.nextUrl.searchParams), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

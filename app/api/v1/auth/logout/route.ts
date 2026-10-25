import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/errors';
import { logout } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    await logout(request);
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

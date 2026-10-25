import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/errors';
import { verifyOtp } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    await verifyOtp(request);
    return NextResponse.json(
      { authenticated: true },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

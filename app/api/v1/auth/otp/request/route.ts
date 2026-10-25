import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api/errors';
import { requestOtp } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    await requestOtp(request);
    return NextResponse.json(
      { message: 'If sign-in is available, a code has been sent.' },
      { status: 202, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

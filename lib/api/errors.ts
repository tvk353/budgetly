import 'server-only';

import { NextResponse } from 'next/server';

import { SupabaseConfigurationError } from '@/lib/supabase/config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown) {
  const requestId = crypto.randomUUID();
  const failure =
    error instanceof ApiError
      ? error
      : error instanceof SupabaseConfigurationError
        ? new ApiError(503, 'BACKEND_NOT_CONFIGURED', error.message)
        : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');

  if (failure.status >= 500) {
    // Do not log provider error bodies, tokens, SQL, or request cookies.
    console.error('Budgetly API failure', { request_id: requestId, code: failure.code });
  }

  return NextResponse.json(
    { error: { code: failure.code, message: failure.message, request_id: requestId } },
    {
      status: failure.status,
      headers: {
        'Cache-Control': 'private, no-store',
        ...(failure.retryAfter ? { 'Retry-After': String(failure.retryAfter) } : {}),
      },
    },
  );
}

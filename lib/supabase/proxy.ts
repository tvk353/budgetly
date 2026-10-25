import { createServerClient } from '@supabase/ssr';
import { isAuthRetryableFetchError, isAuthSessionMissingError } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/database.types';
import { ApiError, apiErrorResponse } from '@/lib/api/errors';

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const { url, key } = getSupabaseConfig();
    const supabase = createServerClient<Database>(url, key, {
      cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: new URL(process.env.APP_ORIGIN ?? request.url).protocol === 'https:',
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values, headers) => {
          for (const { name, value } of values) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error && (isAuthRetryableFetchError(error) || (error.status && error.status >= 500))) {
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
    }
    if (
      error &&
      !isAuthSessionMissingError(error) &&
      ![400, 401, 403, 422].includes(error.status ?? 0)
    ) {
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
    }
    if (!data.user) {
      const redirect = NextResponse.redirect(new URL('/', process.env.APP_ORIGIN ?? request.url));
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      response = redirect;
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    const failure = apiErrorResponse(error);
    for (const cookie of response.cookies.getAll()) failure.cookies.set(cookie);
    return failure;
  }
}

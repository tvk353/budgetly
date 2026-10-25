import 'server-only';

import { isAuthRetryableFetchError, isAuthSessionMissingError } from '@supabase/supabase-js';

import { ApiError } from '@/lib/api/errors';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requireSession(
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  const supabase = client ?? (await createServerSupabaseClient());
  // getSession() alone trusts stored cookie contents; getUser() validates with Auth.
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isAuthRetryableFetchError(error) || (error.status !== undefined && error.status >= 500)) {
      throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
    }
    if (
      isAuthSessionMissingError(error) ||
      error.status === 400 ||
      error.status === 401 ||
      error.status === 403 ||
      error.status === 422
    ) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    }
    throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
  }
  if (!data.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (profileError)
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Workspace access is temporarily unavailable.');
  if (!profile)
    throw new ApiError(403, 'ACCOUNT_UNAVAILABLE', 'An active Budgetly profile is required.');

  return { supabase, user: data.user };
}

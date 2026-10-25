'use client';

import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/database.types';

export function createBrowserSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key, {
    cookieOptions: { sameSite: 'lax', secure: new URL(url).protocol === 'https:' },
  });
}

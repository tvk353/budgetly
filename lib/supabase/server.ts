import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseConfig } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/database.types';

// Route handlers/server actions only: refresh must be able to persist outgoing cookies.
export async function createServerSupabaseClient({
  readOnly = false,
}: { readOnly?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient<Database>(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(process.env.APP_ORIGIN ?? url).protocol === 'https:',
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: readOnly
        ? undefined
        : (values) => {
            for (const { name, value, options } of values) {
              cookieStore.set(name, value, options);
            }
          },
    },
  });
}

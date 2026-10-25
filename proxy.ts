import type { NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    '/workspaces',
    '/workspace/:path*',
    '/transactions',
    '/budget',
    '/savings',
    '/trackers',
    '/more',
  ],
};

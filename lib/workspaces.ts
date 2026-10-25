import 'server-only';

import { ApiError } from '@/lib/api/errors';
import { requireSession } from '@/lib/supabase/session';

export function parseWorkspacePagination(params: URLSearchParams) {
  const allowed = new Set(['page_number', 'limit']);
  if ([...params.keys()].some((key) => !allowed.has(key) || params.getAll(key).length !== 1)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Use page_number and limit only.');
  }
  const pageText = params.get('page_number') ?? '1';
  const limitText = params.get('limit') ?? '20';
  const page = Number(pageText);
  const limit = Number(limitText);
  if (
    !/^[1-9]\d*$/.test(pageText) ||
    !/^[1-9]\d*$/.test(limitText) ||
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    limit > 100 ||
    !Number.isSafeInteger(page * limit)
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid page_number or limit (maximum 100).');
  }
  return { page, limit };
}

function accessibleWorkspaces({ supabase, user }: Awaited<ReturnType<typeof requireSession>>) {
  return supabase
    .from('workspaces')
    .select('id, name, type, created_at, workspace_members!inner(user_id, status)', {
      count: 'exact',
    })
    .eq('workspace_members.user_id', user.id)
    .eq('workspace_members.status', 'active')
    .is('deleted_at', null);
}

export async function listWorkspaces(params: URLSearchParams) {
  const session = await requireSession();
  const { page, limit } = parseWorkspacePagination(params);
  const { data, count, error } = await accessibleWorkspaces(session)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error || !data || count === null) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Workspaces are temporarily unavailable.');
  }
  return {
    data: data.map(({ id, name, type, created_at }) => ({ id, name, type, created_at })),
    page: {
      style: 'page_number',
      limit,
      page_number: page,
      total_count: count,
      total_pages: Math.ceil(count / limit),
    },
  };
}

export async function getWorkspace(
  workspaceId: string,
  currentSession?: Awaited<ReturnType<typeof requireSession>>,
) {
  const session = currentSession ?? (await requireSession());
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) {
    throw new ApiError(404, 'NOT_FOUND', 'Workspace not found.');
  }
  const { data, error } = await accessibleWorkspaces(session).eq('id', workspaceId).maybeSingle();
  if (error)
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Workspace access is temporarily unavailable.');
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Workspace not found.');
  const { id, name, type, created_at } = data;
  return { id, name, type, created_at };
}

export async function getDefaultWorkspaceForSession(
  session: Awaited<ReturnType<typeof requireSession>>,
  type?: 'personal' | 'household',
) {
  let query = accessibleWorkspaces(session);
  if (type) query = query.eq('type', type);
  const { data, error } = await query
    .order('type', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error)
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Workspace access is temporarily unavailable.');
  if (!data) return null;
  const { id, name, type: kind, created_at } = data;
  return { id, name, type: kind, created_at };
}

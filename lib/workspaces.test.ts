import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as listRoute } from '@/app/api/v1/workspaces/route';
import { GET as detailRoute } from '@/app/api/v1/workspaces/[workspaceId]/route';
import { ApiError } from '@/lib/api/errors';
import {
  getWorkspace,
  getDefaultWorkspaceForSession,
  listWorkspaces,
  parseWorkspacePagination,
} from '@/lib/workspaces';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  from: vi.fn(),
  result: vi.fn(),
}));
vi.mock('@/lib/supabase/session', () => ({ requireSession: mocks.session }));

const workspace = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Private workspace',
  type: 'personal',
  created_at: '2026-10-25T00:00:00Z',
  workspace_members: [{ user_id: 'verified-user', status: 'active' }],
};

beforeEach(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: mocks.result,
    maybeSingle: mocks.result,
  };
  mocks.from.mockReset().mockReturnValue(query);
  mocks.session
    .mockReset()
    .mockResolvedValue({ supabase: { from: mocks.from }, user: { id: 'verified-user' } });
  mocks.result.mockReset();
});

describe('workspace authorization and API contracts', () => {
  it('prefers only authorized Household membership, with stable Personal fallback', async () => {
    mocks.result.mockResolvedValue({ data: workspace, error: null });
    const session = await mocks.session();
    expect(await getDefaultWorkspaceForSession(session)).toEqual({
      id: workspace.id,
      name: workspace.name,
      type: 'personal',
      created_at: workspace.created_at,
    });
    const query = mocks.from.mock.results[0].value;
    expect(query.order).toHaveBeenCalledWith('type', { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(query.eq).toHaveBeenCalledWith('workspace_members.user_id', 'verified-user');
    expect(query.eq).toHaveBeenCalledWith('workspace_members.status', 'active');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });
  it('uses verified identity and active membership filters alongside RLS', async () => {
    mocks.result.mockResolvedValue({ data: [workspace], count: 1, error: null });
    const response = await listWorkspaces(new URLSearchParams());
    const query = mocks.from.mock.results[0].value;
    expect(query.eq).toHaveBeenCalledWith('workspace_members.user_id', 'verified-user');
    expect(query.eq).toHaveBeenCalledWith('workspace_members.status', 'active');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(query.range).toHaveBeenCalledWith(0, 19);
    expect(response).toEqual({
      data: [
        {
          id: workspace.id,
          name: workspace.name,
          type: 'personal',
          created_at: workspace.created_at,
        },
      ],
      page: { style: 'page_number', limit: 20, page_number: 1, total_count: 1, total_pages: 1 },
    });
  });

  it('returns a genuine empty authorized list', async () => {
    mocks.result.mockResolvedValue({ data: [], count: 0, error: null });
    expect((await listWorkspaces(new URLSearchParams())).data).toEqual([]);
  });

  it('applies bounded, stable page-number pagination', async () => {
    mocks.result.mockResolvedValue({ data: [], count: 101, error: null });
    const result = await listWorkspaces(new URLSearchParams('page_number=2&limit=100'));
    expect(mocks.result).toHaveBeenCalledWith(100, 199);
    expect(result.page.total_pages).toBe(2);
  });

  it.each([
    'limit=101',
    'limit=0',
    'page_number=-1',
    'page_number=1.5',
    'cursor=abc',
    'user_id=attacker',
    'limit=1&limit=2',
    'page_number=9007199254740991&limit=100',
  ])('rejects invalid or mixed pagination: %s', (params) =>
    expect(() => parseWorkspacePagination(new URLSearchParams(params))).toThrow(ApiError),
  );

  it('returns the same 404 for nonexistent, foreign, removed-member, and deleted workspaces', async () => {
    mocks.result.mockResolvedValue({ data: null, error: null });
    await expect(getWorkspace(workspace.id)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(getWorkspace('not-a-uuid')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(mocks.result).toHaveBeenCalledTimes(1);
  });

  it('does not return an empty success on database failure', async () => {
    mocks.result.mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'sensitive SQL' },
    });
    await expect(listWorkspaces(new URLSearchParams())).rejects.toMatchObject({ status: 503 });
  });

  it('returns an uncached 401 envelope before any database query', async () => {
    mocks.session.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
    const response = await listRoute(new NextRequest('http://localhost/api/v1/workspaces'));
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Sign in to continue.',
        request_id: expect.any(String),
      },
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns the authorized detail without exposing embedded membership records', async () => {
    mocks.result.mockResolvedValue({ data: workspace, error: null });
    const response = await detailRoute(new Request('http://localhost'), {
      params: Promise.resolve({ workspaceId: workspace.id }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({
      id: workspace.id,
      name: workspace.name,
      type: 'personal',
      created_at: workspace.created_at,
    });
  });

  it('sanitizes unexpected errors and logs only a correlation code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.session.mockRejectedValue(new Error('secret token and SQL'));
    const response = await listRoute(new NextRequest('http://localhost/api/v1/workspaces'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
    expect(log).toHaveBeenCalledWith('Budgetly API failure', {
      request_id: expect.any(String),
      code: 'INTERNAL_ERROR',
    });
    log.mockRestore();
  });
});

// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/workspaces/selection/route';
import { requireWorkspacePage } from '@/lib/auth/pages';
import { ApiError } from '@/lib/api/errors';
import { selectedWorkspaceCookie } from '@/lib/workspace-data';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  getWorkspace: vi.fn(),
  defaultWorkspace: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock('@/lib/supabase/session', () => ({ requireSession: mocks.session }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/workspaces', () => ({
  getWorkspace: mocks.getWorkspace,
  getDefaultWorkspaceForSession: mocks.defaultWorkspace,
}));
const workspace = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Our home',
  type: 'household',
  created_at: '',
};
const session = { user: { id: 'verified-user' }, supabase: {} };
function request(body: unknown, origin = 'http://127.0.0.1:3000') {
  return new NextRequest('http://127.0.0.1:3000/api/v1/workspaces/selection', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.session.mockResolvedValue(session);
  mocks.getWorkspace.mockResolvedValue(workspace);
  mocks.defaultWorkspace.mockResolvedValue(workspace);
});
afterEach(() => vi.unstubAllEnvs());

describe('workspace selection authorization', () => {
  it('sets a private preference only after an authorized detail lookup', async () => {
    const response = await POST(request({ workspace_id: workspace.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(workspace);
    expect(mocks.getWorkspace).toHaveBeenCalledWith(workspace.id);
    expect(mocks.set).toHaveBeenCalledWith(
      selectedWorkspaceCookie,
      workspace.id,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      }),
    );
  });
  it.each([401, 404, 503])(
    'does not persist failed authorization or provider errors (%i)',
    async (status) => {
      mocks.getWorkspace.mockRejectedValue(new ApiError(status, 'DENIED', 'Unavailable.'));
      expect((await POST(request({ workspace_id: workspace.id }))).status).toBe(status);
      expect(mocks.set).not.toHaveBeenCalled();
    },
  );
  it('rejects cross-origin selection and caller-supplied identity/roles', async () => {
    expect(
      (await POST(request({ workspace_id: workspace.id }, 'https://attacker.test'))).status,
    ).toBe(403);
    expect((await POST(request({ workspace_id: workspace.id, role: 'owner' }))).status).toBe(400);
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
  it('rechecks the exact preference with the verified session on every page', async () => {
    mocks.get.mockReturnValue({ value: workspace.id });
    expect((await requireWorkspacePage('household')).workspace).toEqual(workspace);
    expect(mocks.getWorkspace).toHaveBeenCalledWith(workspace.id, session);
    expect(mocks.defaultWorkspace).not.toHaveBeenCalled();
  });
  it.each(['foreign', 'removed', 'deleted', 'malformed'])(
    'redirects a %s preference without silently selecting another household',
    async () => {
      mocks.get.mockReturnValue({ value: 'unavailable-id' });
      mocks.getWorkspace.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Workspace not found.'));
      await expect(requireWorkspacePage('household')).rejects.toThrow('redirect:/workspaces');
      expect(mocks.defaultWorkspace).not.toHaveBeenCalled();
    },
  );
  it('loads an authorized default only when there is no stored preference', async () => {
    expect((await requireWorkspacePage()).workspace).toEqual(workspace);
    expect(mocks.defaultWorkspace).toHaveBeenCalledWith(session, undefined);
  });
  it('does not turn database failure into an authorization redirect', async () => {
    mocks.defaultWorkspace.mockRejectedValue(
      new ApiError(503, 'DATABASE_UNAVAILABLE', 'Unavailable.'),
    );
    await expect(requireWorkspacePage()).rejects.toMatchObject({ status: 503 });
  });
  it('redirects to onboarding when no authorized workspace exists', async () => {
    mocks.defaultWorkspace.mockResolvedValue(null);
    await expect(requireWorkspacePage()).rejects.toThrow('redirect:/workspaces');
  });
});

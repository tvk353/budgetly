import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaces, selectWorkspace } from '@/lib/workspace-client';

const workspace = { id: 'real-id', name: 'Real home', type: 'household', created_at: '2026-10-25' };
afterEach(() => vi.unstubAllGlobals());

describe('workspace API client', () => {
  it('loads every page without exceeding the API limit', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: [workspace], page: { total_pages: 2 } }))
      .mockResolvedValueOnce(
        Response.json({ data: [{ ...workspace, id: 'second-id' }], page: { total_pages: 2 } }),
      );
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await loadWorkspaces(signal)).toHaveLength(2);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/workspaces?page_number=1&limit=100', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces?page_number=2&limit=100',
      expect.any(Object),
    );
  });

  it('rejects invalid records instead of accepting a sample-shaped fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ data: [{ type: 'admin' }], page: { total_pages: 1 } })),
    );
    await expect(loadWorkspaces(new AbortController().signal)).rejects.toThrow(
      'response was invalid',
    );
  });

  it('does not return a partial success when a later page fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ data: [workspace], page: { total_pages: 2 } }))
        .mockResolvedValueOnce(
          Response.json(
            { error: { message: 'Workspaces are temporarily unavailable.' } },
            { status: 503 },
          ),
        ),
    );
    await expect(loadWorkspaces(new AbortController().signal)).rejects.toThrow(
      'temporarily unavailable',
    );
  });

  it('persists selection through a same-origin request, not a browser-written cookie', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(workspace));
    vi.stubGlobal('fetch', fetch);
    expect(await selectWorkspace('real-id')).toEqual(workspace);
    expect(fetch).toHaveBeenCalledWith('/api/v1/workspaces/selection', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{"workspace_id":"real-id"}',
    });
  });
});

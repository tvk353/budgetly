import { expect, test } from '@playwright/test';

test('workspace APIs reject unauthenticated requests and protected pages redirect', async ({
  page,
  request,
}) => {
  for (const path of [
    '/api/v1/workspaces',
    '/api/v1/workspaces/20000000-0000-4000-8000-000000000001',
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeUndefined();
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  const selection = await request.post('/api/v1/workspaces/selection', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: { workspace_id: '20000000-0000-4000-8000-000000000001' },
  });
  expect(selection.status()).toBe(401);
  expect(selection.headers()['set-cookie']).toBeUndefined();
  for (const path of [
    '/workspaces',
    '/workspace/household',
    '/workspace/personal',
    '/transactions',
    '/budget',
    '/savings',
    '/trackers',
    '/more',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL('http://127.0.0.1:3100/');
  }
});

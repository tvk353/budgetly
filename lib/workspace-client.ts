import type { Workspace } from '@/lib/workspace-data';

function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'type' in value &&
    (value.type === 'personal' || value.type === 'household') &&
    'created_at' in value &&
    typeof value.created_at === 'string'
  );
}

async function responseBody(response: Response) {
  const result: unknown = await response.json();
  if (!response.ok) {
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      result.error &&
      typeof result.error === 'object' &&
      'message' in result.error &&
      typeof result.error.message === 'string'
        ? result.error.message
        : 'Workspace access failed. Please try again.';
    throw new Error(message);
  }
  return result;
}

export async function loadWorkspaces(signal: AbortSignal): Promise<Workspace[]> {
  const workspaces: Workspace[] = [];
  let pageNumber = 1;
  let totalPages: number;
  do {
    const response = await fetch(`/api/v1/workspaces?page_number=${pageNumber}&limit=100`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
    const result = await responseBody(response);
    if (
      !result ||
      typeof result !== 'object' ||
      !('data' in result) ||
      !Array.isArray(result.data) ||
      !result.data.every(isWorkspace) ||
      !('page' in result) ||
      !result.page ||
      typeof result.page !== 'object' ||
      !('total_pages' in result.page) ||
      typeof result.page.total_pages !== 'number' ||
      !Number.isSafeInteger(result.page.total_pages) ||
      result.page.total_pages < 0
    ) {
      throw new Error('The workspace response was invalid. Please try again.');
    }
    workspaces.push(...result.data);
    totalPages = result.page.total_pages;
    pageNumber += 1;
  } while (pageNumber <= totalPages);
  return workspaces;
}

export async function selectWorkspace(workspaceId: string): Promise<Workspace> {
  const response = await fetch('/api/v1/workspaces/selection', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
  const workspace = await responseBody(response);
  if (!isWorkspace(workspace)) throw new Error('The selected workspace response was invalid.');
  return workspace;
}

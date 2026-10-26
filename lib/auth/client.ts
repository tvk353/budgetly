export async function authRequest(path: string, body?: Record<string, string>) {
  const response = await fetch(`/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error?.message ?? 'Authentication failed. Please try again.');
  }
}

export function navigateAfterAuth(path: '/' | '/workspace/household') {
  window.location.assign(path);
}

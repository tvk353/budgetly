import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SignOutButton } from './sign-out-button';
const mocks = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn() }));
vi.mock('@/lib/auth/client', () => ({
  authRequest: mocks.request,
  navigateAfterAuth: mocks.navigate,
}));
beforeEach(() => {
  mocks.request.mockReset().mockResolvedValue(undefined);
  mocks.navigate.mockReset();
});
it('revokes the local session before discarding the authenticated page', async () => {
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/'));
  expect(mocks.request).toHaveBeenCalledWith('logout');
});
it('shows sign-out failures and stays on the page', async () => {
  mocks.request.mockRejectedValue(new Error('Unable to sign out.'));
  render(<SignOutButton />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign out.');
  expect(mocks.navigate).not.toHaveBeenCalled();
});

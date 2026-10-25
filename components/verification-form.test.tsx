import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationForm } from './verification-form';

const mocks = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn() }));
vi.mock('@/lib/auth/client', () => ({
  authRequest: mocks.request,
  navigateAfterAuth: mocks.navigate,
}));
beforeEach(() => {
  mocks.request.mockReset().mockResolvedValue(undefined);
  mocks.navigate.mockReset();
});

describe('VerificationForm', () => {
  it('starts empty and verifies the entered OTP with the server', async () => {
    render(<VerificationForm email="person@example.test" />);
    expect(screen.getByLabelText('Verification code')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/workspaces'));
    expect(mocks.request).toHaveBeenCalledWith('otp/verify', {
      email: 'person@example.test',
      otp: '123456',
    });
  });
  it.each(['The code is invalid or expired.', 'Authentication is temporarily unavailable.'])(
    'shows verification errors without navigating: %s',
    async (message) => {
      mocks.request.mockRejectedValue(new Error(message));
      render(<VerificationForm email="person@example.test" />);
      fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(mocks.navigate).not.toHaveBeenCalled();
    },
  );
  it('rejects malformed codes locally', () => {
    render(<VerificationForm email="person@example.test" />);
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the 6-digit');
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('resends through the server and shows cooldown errors', async () => {
    mocks.request.mockRejectedValue(new Error('Please wait before requesting another code.'));
    render(<VerificationForm email="person@example.test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait');
    expect(mocks.request).toHaveBeenCalledWith('otp/request', { email: 'person@example.test' });
  });
});

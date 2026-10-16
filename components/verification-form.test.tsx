import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { VerificationForm } from './verification-form';

describe('VerificationForm', () => {
  it('opens workspace selection after the mock OTP is verified', () => {
    render(<VerificationForm email="hello@budgetly.app" />);

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(push).toHaveBeenCalledWith('/workspaces');
  });

  it('keeps invalid codes on the verification screen', () => {
    render(<VerificationForm email="hello@budgetly.app" />);
    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(
      screen.getByText('That code does not match the mock verification code.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

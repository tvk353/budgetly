import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';
const mocks = vi.hoisted(() => ({ push: vi.fn(), request: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/auth/client', () => ({ authRequest: mocks.request }));
beforeEach(() => {
  mocks.push.mockReset();
  mocks.request.mockReset().mockResolvedValue(undefined);
});

describe('LoginForm', () => {
  it('requests a normalized email OTP before navigating', async () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email address')).toHaveValue('priyavinod.t@gmail.com');
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'Person@Example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/verify?email=person%40example.test'),
    );
    expect(mocks.request).toHaveBeenCalledWith('otp/request', { email: 'person@example.test' });
  });
  it('does not pretend a provider failure sent an email', async () => {
    mocks.request.mockRejectedValue(new Error('Unable to send a code.'));
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'person@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

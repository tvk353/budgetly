'use client';

import { useState } from 'react';

import Link from 'next/link';
import { authRequest, navigateAfterAuth } from '@/lib/auth/client';

export function VerificationForm({ email }: { email?: string }) {
  const address = email ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setError('');
    setPending(true);
    try {
      await authRequest('otp/verify', { email: address, otp: code });
      // A full navigation discards any previously cached authenticated RSC payloads.
      navigateAfterAuth('/workspaces');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to verify the code.');
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await authRequest('otp/request', { email: address });
      setNotice('A new code has been sent. Check your inbox.');
      setCode('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to resend the code.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card-surface)] p-6 shadow-[0_10px_35px_rgba(23,107,87,0.08)] sm:p-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
        Verify your email
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]">
        Enter the code we sent
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">
        We sent a 6-digit code to{' '}
        <span className="font-medium text-[var(--color-main-text)]">{address}</span>.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="otp"
            className="mb-2 block text-sm font-medium text-[var(--color-main-text)]"
          >
            Verification code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base text-[var(--color-main-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-soft-green)]"
            aria-invalid={Boolean(error)}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !address}
          className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,107,87,0.25)] transition hover:bg-[#114d41]"
        >
          {pending ? 'Please wait...' : 'Verify email'}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
        Codes expire in five minutes. You have up to three verification attempts.
        <button
          type="button"
          onClick={resend}
          disabled={pending || !address}
          className="mt-2 block font-semibold text-[var(--color-primary)]"
        >
          Resend code
        </button>
        <Link href="/" className="mt-2 block font-semibold text-[var(--color-primary)]">
          Use a different email
        </Link>
        {notice && (
          <p role="status" className="mt-2">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}

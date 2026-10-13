'use client';

import { useState } from 'react';

import { demoOtp } from '@/lib/mock-data';

export function VerificationForm({ email }: { email?: string }) {
  const address = email ?? 'hello@budgetly.app';
  const [code, setCode] = useState(demoOtp);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    if (code !== demoOtp) {
      setError('That code does not match the mock verification code.');
      return;
    }

    setError('');
    setVerified(true);
  };

  if (verified) {
    return (
      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card-surface)] p-6 shadow-[0_10px_35px_rgba(23,107,87,0.08)] sm:p-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
          Verified
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]">
          Email verified
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">
          You are signed in as{' '}
          <span className="font-medium text-[var(--color-main-text)]">{address}</span>.
        </p>
        <div className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
          Demo code used: <span className="font-semibold">{demoOtp}</span>
        </div>
      </section>
    );
  }

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
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base text-[var(--color-main-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-soft-green)]"
            aria-invalid={Boolean(error)}
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,107,87,0.25)] transition hover:bg-[#114d41]"
        >
          Verify email
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
        Demo code: <span className="font-semibold">{demoOtp}</span>
      </div>
    </section>
  );
}

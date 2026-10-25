'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { budgetlyBrand } from '@/lib/mock-data';
import { authRequest } from '@/lib/auth/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) return;
    const normalized = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setPending(true);
    try {
      await authRequest('otp/request', { email: normalized });
      router.push(`/verify?email=${encodeURIComponent(normalized)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send a code.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card-surface)] p-6 shadow-[0_10px_35px_rgba(23,107,87,0.08)] sm:p-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
        Welcome back
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]">
        Log in to your workspace
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">
        {budgetlyBrand.tagline}
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[var(--color-main-text)]"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
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
          disabled={pending}
          className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,107,87,0.25)] transition hover:bg-[#114d41]"
        >
          {pending ? 'Sending code...' : 'Continue'}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
        We will email you a single-use sign-in code. It expires in five minutes.
      </div>
    </section>
  );
}

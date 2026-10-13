"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { budgetlyBrand, demoEmail } from "@/lib/mock-data";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(demoEmail);
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    router.push(`/verify?email=${encodeURIComponent(normalized)}`);
  };

  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card-surface)] p-6 shadow-[0_10px_35px_rgba(23,107,87,0.08)] sm:p-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-secondary-text)]">
        Welcome back
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-main-text)]">
        Log in to your workspace
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-secondary-text)]">{budgetlyBrand.tagline}</p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--color-main-text)]">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base text-[var(--color-main-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-soft-green)]"
            aria-invalid={Boolean(error)}
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(23,107,87,0.25)] transition hover:bg-[#114d41]"
        >
          Continue
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-[var(--color-light-teal)] bg-[var(--color-light-teal)] px-4 py-3 text-sm text-[var(--color-main-text)]">
        Demo email: <span className="font-medium">{demoEmail}</span>
      </div>
    </section>
  );
}

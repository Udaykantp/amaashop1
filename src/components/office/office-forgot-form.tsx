"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { sendPasswordReset } from "@/lib/auth/client";

export function OfficeForgotForm() {
  const [pending, start] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(fd: FormData) {
    const email = String(fd.get("email") ?? "").trim();
    setError(null);
    start(async () => {
      const res = await requestPasswordResetAction(email);
      if (res.sentVia === "firebase") {
        const fallback = await sendPasswordReset(email);
        if (!fallback.ok) {
          setError(fallback.error);
          return;
        }
      }
      setSentTo(email);
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-xl font-medium text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          We&apos;ll email you a secure link to set a new one.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {sentTo ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-teal-600" />
            <p className="mt-3 text-sm text-slate-700">
              If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is
              on its way. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send reset link
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/office/login" className="font-medium text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

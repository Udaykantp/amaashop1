"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { sendPasswordReset } from "@/lib/auth/client";
import { Spinner } from "@/components/ui/spinner";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(email);
      if (result.sentVia === "firebase") {
        // No custom email provider configured (or it just failed) — fall
        // back to Firebase Auth's own mailer so the user isn't stranded.
        const fallback = await sendPasswordReset(email);
        if (!fallback.ok) {
          setError(fallback.error);
          return;
        }
      }
      setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <p className="mt-3 text-sm text-neutral-600">
          If an account exists for <span className="font-medium text-neutral-800">{sentTo}</span>, we&apos;ve sent a
          link to reset your password. Check your inbox and spam folder.
        </p>
        <Link
          href="/signin"
          className="mt-5 inline-block w-full rounded-lg border border-neutral-200 px-4 py-3 text-center text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="forgot-password-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email *
        </label>
        <input
          required
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          className={FIELD_CLASS}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? <Spinner size="xs" /> : null}
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

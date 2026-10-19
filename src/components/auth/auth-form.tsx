"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn, signUp } from "@/lib/auth/client";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setMessage(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    startTransition(async () => {
      const result = mode === "signup" ? await signUp(name, email, password) : await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (mode === "signup" && result.needsEmailVerification) {
        setMessage("Check your email to confirm your account.");
      }
      router.push("/account");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Full Name</label>
          <input name="name" type="text" autoComplete="name" className={FIELD_CLASS} />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Email *</label>
        <input required name="email" type="email" autoComplete="email" className={FIELD_CLASS} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">Password *</label>
          {mode === "signin" && (
            <Link href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:underline">
              Forgot password?
            </Link>
          )}
        </div>
        <input
          required
          name="password"
          type="password"
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className={FIELD_CLASS}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
      </button>
    </form>
  );
}

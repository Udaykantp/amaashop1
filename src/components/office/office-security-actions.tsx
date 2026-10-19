"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { sendPasswordReset } from "@/lib/auth/client";

export function OfficeSecurityActions({ email }: { email: string | null }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-base font-medium text-slate-900">Password</h2>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ll email a secure link to {email ?? "your address"} to set a new password.
      </p>
      {sent ? (
        <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Reset link sent. Check your inbox and spam folder.
        </p>
      ) : (
        <button
          type="button"
          disabled={pending || !email}
          onClick={() =>
            start(async () => {
              const target = email ?? "";
              const res = await requestPasswordResetAction(target);
              if (res.sentVia === "firebase") await sendPasswordReset(target);
              setSent(true);
            })
          }
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Email me a reset link
        </button>
      )}
    </div>
  );
}

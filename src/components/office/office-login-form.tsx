"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn, signInWithGoogle } from "@/lib/auth/client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function OfficeLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/office";
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function done(res: { ok: true } | { ok: false; error: string }) {
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(next.startsWith("/office") ? next : "/office");
    router.refresh();
  }

  function onSubmit(fd: FormData) {
    setError(null);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    start(async () => done(await signIn(email, password)));
  }

  function onGoogle() {
    setError(null);
    start(async () => done(await signInWithGoogle()));
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
          A
        </span>
        <h1 className="font-serif text-xl font-medium text-slate-900">Distributor Back-Office</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage your AmaaShop network.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onGoogle}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

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
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link href="/office/forgot" className="text-xs font-medium text-teal-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            Sign in
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Not a distributor yet?{" "}
        <Link href="/member/join" className="font-medium text-teal-700 hover:underline">
          Join the network
        </Link>
      </p>
    </div>
  );
}

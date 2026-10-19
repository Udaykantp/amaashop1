"use client";

import { CheckCircle2, Mail, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/actions/newsletter";

export function NewsletterSignup() {
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await subscribeNewsletterAction(formData);
      if (result.success) setSubscribed(true);
      else setError(result.error);
    });
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 shadow-lg lg:p-8">
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Mail size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Get 10% off your first order</h2>
            <p className="mt-1 text-sm text-emerald-50">Weekly deals and fresh arrivals, straight to your inbox.</p>
          </div>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-sm font-medium text-white">
            <CheckCircle2 size={18} />
            You&apos;re subscribed — check your inbox soon.
          </div>
        ) : (
          <form action={handleSubmit} className="w-full shrink-0 lg:w-auto">
            <div className="flex w-full gap-2 lg:w-96">
              <input
                required
                name="email"
                type="email"
                placeholder="Enter your email"
                className="h-11 flex-1 rounded-lg border-0 bg-white px-4 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                <Send size={16} />
                <span className="hidden sm:inline">{isPending ? "..." : "Subscribe"}</span>
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-amber-100">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

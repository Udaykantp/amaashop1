"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { submitContactAction } from "@/actions/contact";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await submitContactAction(formData);
      if (result.success) setSubmitted(true);
      else setError(result.error);
    });
  };

  if (submitted) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 size={48} className="text-emerald-600" />
        <p className="mt-4 text-lg font-semibold text-neutral-800">Message Sent!</p>
        <p className="mt-1 text-sm text-neutral-500">We&apos;ll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name *</label>
          <input required name="name" type="text" className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email *</label>
          <input required name="email" type="email" className={FIELD_CLASS} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Subject *</label>
        <input required name="subject" type="text" className={FIELD_CLASS} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Message *</label>
        <textarea required name="message" rows={5} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
      >
        <Send size={16} />
        {isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

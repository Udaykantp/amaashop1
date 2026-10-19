"use client";

import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cod" | "card" | "upi";

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; desc: string }[] = [
  { key: "cod", label: "Cash on Delivery", desc: "Pay when you receive" },
  { key: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, Amex" },
  { key: "upi", label: "UPI / Wallet", desc: "Pay via UPI app" },
];

export function PaymentStep({ value, onChange }: { value: PaymentMethod; onChange: (method: PaymentMethod) => void }) {
  return (
    <div className="animate-page-enter rounded-xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 text-base font-bold text-neutral-800 lg:text-lg">Payment Method</h2>
      <div className="space-y-3">
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
              value === opt.key ? "border-emerald-500 bg-emerald-50" : "border-neutral-200",
            )}
          >
            <CreditCard size={22} className={value === opt.key ? "text-emerald-600" : "text-neutral-400"} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-800">{opt.label}</p>
              <p className="text-xs text-neutral-500">{opt.desc}</p>
            </div>
            <div className={cn("h-5 w-5 rounded-full border-2", value === opt.key ? "border-emerald-500 bg-emerald-500" : "border-neutral-300")} />
          </button>
        ))}
        {value !== "cod" && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Online payment is a demo. No actual payment will be processed.
          </div>
        )}
      </div>
    </div>
  );
}

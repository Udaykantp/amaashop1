"use client";

import { useCurrency } from "@/store/currency-provider";
import { cn } from "@/lib/utils";

export function FooterCurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 p-1">
      {(["INR", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            currency === c ? "bg-emerald-500 text-white" : "text-neutral-400 hover:text-white",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

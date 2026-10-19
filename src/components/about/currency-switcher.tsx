"use client";

import { useCurrency } from "@/store/currency-provider";
import { cn } from "@/lib/utils";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center space-x-2 rounded-lg border bg-white p-1">
      {(["INR", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            currency === c ? "bg-emerald-500 text-white" : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

"use client";

import { Truck } from "lucide-react";
import type { DeliveryOption } from "@/lib/checkout/pricing";
import { EXPRESS_SHIPPING, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DeliveryStep({
  subtotal,
  value,
  onChange,
}: {
  subtotal: number;
  value: DeliveryOption;
  onChange: (option: DeliveryOption) => void;
}) {
  return (
    <div className="animate-page-enter rounded-xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 text-base font-bold text-neutral-800 lg:text-lg">Delivery Method</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onChange("standard")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
            value === "standard" ? "border-emerald-500 bg-emerald-50" : "border-neutral-200",
          )}
        >
          <Truck size={22} className={value === "standard" ? "text-emerald-600" : "text-neutral-400"} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-800">Standard Delivery</p>
            <p className="text-xs text-neutral-500">3-5 business days</p>
          </div>
          <span className="text-sm font-bold text-neutral-800">
            {subtotal > FREE_SHIPPING_THRESHOLD ? "FREE" : formatPrice(STANDARD_SHIPPING)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("express")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
            value === "express" ? "border-emerald-500 bg-emerald-50" : "border-neutral-200",
          )}
        >
          <Truck size={22} className={value === "express" ? "text-emerald-600" : "text-neutral-400"} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-800">Express Delivery</p>
            <p className="text-xs text-neutral-500">1-2 business days</p>
          </div>
          <span className="text-sm font-bold text-neutral-800">{formatPrice(EXPRESS_SHIPPING)}</span>
        </button>
      </div>
    </div>
  );
}

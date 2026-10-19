"use client";

import { ChevronRight, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/store/toast-provider";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from "@/lib/checkout/pricing";

export function CartSummary({ subtotal }: { subtotal: number }) {
  const router = useRouter();
  const { show } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax - appliedDiscount;

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "SAVE10") {
      setAppliedDiscount(subtotal * 0.1);
      show("Coupon applied! 10% off", "success");
    } else {
      show("Invalid coupon code", "error");
    }
  };

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 lg:sticky lg:top-24 lg:p-6">
      <h2 className="text-base font-bold text-neutral-800 lg:text-lg">Order Summary</h2>

      <div className="mt-3 flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-neutral-200 px-3">
          <Tag size={16} className="text-neutral-400" />
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Coupon code (try SAVE10)"
            className="h-10 flex-1 border-0 bg-transparent px-2 text-xs focus:outline-none"
          />
        </div>
        <button onClick={applyCoupon} className="rounded-lg bg-neutral-800 px-4 text-xs font-semibold text-white hover:bg-neutral-900">
          Apply
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span className="font-semibold text-neutral-800">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Shipping</span>
          <span className="font-semibold text-neutral-800">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Taxes (8%)</span>
          <span className="font-semibold text-neutral-800">{formatPrice(tax)}</span>
        </div>
        {appliedDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span className="font-semibold">-{formatPrice(appliedDiscount)}</span>
          </div>
        )}
        {shipping > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping!
          </p>
        )}
        <div className="border-t border-neutral-100 pt-3">
          <div className="flex justify-between">
            <span className="text-base font-bold text-neutral-800">Total</span>
            <span className="text-base font-bold text-red-600">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => router.push("/checkout")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Proceed to Checkout
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

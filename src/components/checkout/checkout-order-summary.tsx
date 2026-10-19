"use client";

import Image from "next/image";
import { estimateTotals, type DeliveryOption } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function CheckoutOrderSummary({
  items,
  subtotal,
  deliveryOption,
}: {
  items: CartItem[];
  subtotal: number;
  deliveryOption: DeliveryOption;
}) {
  const { shipping, tax, total } = estimateTotals(subtotal, deliveryOption);

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 lg:sticky lg:top-24 lg:p-6">
      <h2 className="text-base font-bold text-neutral-800 lg:text-lg">Your Order</h2>
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto lg:max-h-64">
        {items.map((item) => (
          <div key={item.product.id} className="flex gap-2 lg:gap-3">
            <div className="relative h-12 w-12 shrink-0 lg:h-14 lg:w-14">
              <Image src={item.product.image_url} alt={item.product.name} fill sizes="56px" className="rounded-lg border border-neutral-100 object-cover" />
            </div>
            <div className="flex-1">
              <p className="line-clamp-1 text-xs font-medium text-neutral-800 lg:text-sm">{item.product.name}</p>
              <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
            </div>
            <span className="text-xs font-semibold text-neutral-800 lg:text-sm">{formatPrice(item.product.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Shipping</span>
          <span className="font-semibold">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Taxes</span>
          <span className="font-semibold">{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-100 pt-2">
          <span className="text-base font-bold text-neutral-800">Total</span>
          <span className="text-base font-bold text-red-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}

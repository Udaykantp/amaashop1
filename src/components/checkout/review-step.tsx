"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function ReviewStep({ items }: { items: CartItem[] }) {
  return (
    <div className="animate-page-enter rounded-xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 text-base font-bold text-neutral-800 lg:text-lg">Order Review</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.product.id} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0">
              <Image src={item.product.image_url} alt={item.product.name} fill sizes="56px" className="rounded-lg border border-neutral-100 object-cover" />
            </div>
            <div className="flex-1">
              <p className="line-clamp-1 text-sm font-medium text-neutral-800">{item.product.name}</p>
              <p className="text-xs text-neutral-500">
                Qty: {item.quantity} × {formatPrice(item.product.price)}
              </p>
            </div>
            <span className="text-sm font-semibold text-neutral-800">{formatPrice(item.product.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <Shield size={16} />
        Your payment information is secure and encrypted
      </div>
    </div>
  );
}

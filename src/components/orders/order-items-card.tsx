import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrderItemsCard({ order }: { order: Order }) {
  return (
    <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 text-base font-bold text-neutral-800">Items in Order</h2>
      <div className="space-y-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0">
              <Image src={item.image_url} alt={item.name} fill sizes="56px" className="rounded-lg border border-neutral-100 object-cover" />
            </div>
            <div className="flex-1">
              <p className="line-clamp-1 text-sm font-medium text-neutral-800">{item.name}</p>
              <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
            </div>
            <span className="text-sm font-semibold text-neutral-800">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span className="font-semibold">{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Shipping</span>
          <span className="font-semibold">{order.shipping === 0 ? "FREE" : formatPrice(order.shipping)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-100 pt-2">
          <span className="font-bold text-neutral-800">Total</span>
          <span className="font-bold text-red-600">{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  );
}

import { Clock } from "lucide-react";
import type { Order } from "@/lib/types";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending: "bg-amber-50 text-amber-600",
  processing: "bg-blue-50 text-blue-600",
  shipped: "bg-emerald-50 text-emerald-600",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-600",
};

export function OrderHeaderCard({ order }: { order: Order }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-400">Order Number</p>
          <h1 className="text-lg font-bold text-neutral-800">#{order.id.slice(0, 8).toUpperCase()}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
        <Clock size={16} className="text-neutral-400" />
        Placed on {new Date(order.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

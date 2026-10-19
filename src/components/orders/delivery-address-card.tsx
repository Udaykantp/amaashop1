import { MapPin, Phone } from "lucide-react";
import type { Order } from "@/lib/types";

export function DeliveryAddressCard({ order }: { order: Order }) {
  return (
    <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-neutral-800">
        <MapPin size={18} className="text-emerald-600" />
        Delivery Address
      </h2>
      <p className="text-sm font-medium text-neutral-800">{order.customer_name}</p>
      <p className="text-sm text-neutral-600">{order.shipping_address}</p>
      <p className="text-sm text-neutral-600">
        {order.city}
        {order.zip_code ? `, ${order.zip_code}` : ""}
      </p>
      {order.customer_phone && (
        <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
          <Phone size={14} /> {order.customer_phone}
        </p>
      )}
    </div>
  );
}

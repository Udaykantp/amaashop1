import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderHeaderCard } from "@/components/orders/order-header-card";
import { OrderTrackingTimeline } from "@/components/orders/order-tracking-timeline";
import { OrderItemsCard } from "@/components/orders/order-items-card";
import { DeliveryAddressCard } from "@/components/orders/delivery-address-card";
import { getOrderById } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Order Tracking",
  // Order pages carry customer PII (name, address, phone) — never indexable.
  robots: { index: false, follow: false },
};

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderTrackingPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 lg:px-8 lg:py-8">
      <OrderHeaderCard order={order} />

      <div className="mt-4 rounded-2xl border border-neutral-100 bg-white p-4 lg:p-6">
        <h2 className="mb-4 text-base font-bold text-neutral-800">Order Tracking</h2>
        <OrderTrackingTimeline status={order.status} />
      </div>

      <OrderItemsCard order={order} />
      <DeliveryAddressCard order={order} />

      <Link
        href="/contact"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        Need Help? Contact Support
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}

import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/orders/track-order-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: `Look up the status of your ${SITE_NAME} order using your order ID.`,
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">Track Your Order</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {SITE_NAME} checkout doesn&apos;t require an account — enter your order ID below to see its status.
      </p>
      <TrackOrderForm />
    </div>
  );
}

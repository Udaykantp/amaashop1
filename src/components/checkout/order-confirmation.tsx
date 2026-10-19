import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function OrderConfirmation({ orderId }: { orderId: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 animate-heart-pop">
        <CheckCircle2 size={48} />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-neutral-800">Order Placed Successfully!</h1>
      <p className="mt-2 text-neutral-500">
        Thank you for your purchase. Your order number is{" "}
        <span className="font-semibold text-neutral-800">#{orderId.slice(0, 8).toUpperCase()}</span>
      </p>
      <p className="mt-1 text-sm text-neutral-500">A confirmation email will be sent to you shortly.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Track Order
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

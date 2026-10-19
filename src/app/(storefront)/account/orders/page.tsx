import type { Metadata } from "next";
import { ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getOrdersByEmail } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();

  if (!user?.email) redirect("/signin");

  const orders = await getOrdersByEmail(user.email);

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 lg:px-8 lg:py-8">
      <h1 className="text-lg font-bold text-neutral-800 lg:text-2xl">My Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <ShoppingBag size={32} />
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            No orders yet under <span className="font-medium text-neutral-700">{user.email}</span>.
          </p>
          <Link href="/shop" className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4 hover:border-emerald-200"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-800">#{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {new Date(order.created_at).toLocaleDateString()} · {order.items.length} {order.items.length === 1 ? "item" : "items"}
                </p>
                <p className="mt-1 text-xs font-medium capitalize text-emerald-600">{order.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-800">{formatPrice(order.total)}</span>
                <ChevronRight size={18} className="text-neutral-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

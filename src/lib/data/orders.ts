import "server-only";
import { Collections, db } from "@/server/firestore";
import type { GuestOrderDoc } from "@/server/models";
import type { Order } from "@/lib/types";

function toOrder(id: string, r: GuestOrderDoc): Order {
  return {
    id,
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    customer_phone: r.customer_phone,
    shipping_address: r.shipping_address,
    city: r.city,
    zip_code: r.zip_code,
    items: r.items,
    subtotal: r.subtotal,
    shipping: r.shipping,
    total: r.total,
    status: r.status,
    created_at: r.created_at.toDate().toISOString(),
  };
}

/**
 * Deliberately uncached: order status changes over time and this is
 * per-customer data, not a public catalog page — every request should see
 * the current state, not a shared snapshot from another visitor's request.
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const snap = await db().collection(Collections.guestOrders).doc(orderId).get();
  if (!snap.exists) return null;
  return toOrder(snap.id, snap.data() as GuestOrderDoc);
}

/** Order history for the signed-in user, matched by email — the schema has
 * no `user_id` FK on `orders` (guest checkout by design), so email is the
 * only link available between an auth session and past orders. */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const snap = await db().collection(Collections.guestOrders).where("customer_email", "==", email).orderBy("created_at", "desc").get();
  return snap.docs.map((d) => toOrder(d.id, d.data() as GuestOrderDoc));
}

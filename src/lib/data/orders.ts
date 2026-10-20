import "server-only";
import type { Order } from "@/lib/types";

// DATABASE COMMENTED OUT — USING MOCK DATA
// import { Collections, db } from "@/server/firestore";
// import type { GuestOrderDoc } from "@/server/models";

const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: "AMA-ORD-8821",
    customer_name: "Rahul Sharma",
    customer_email: "udaykantp9199@gmail.com",
    customer_phone: "+91 98765 43210",
    shipping_address: "Flat 402, Green View Apartments, Indiranagar",
    city: "Bengaluru",
    zip_code: "560038",
    items: [
      {
        product_id: "prod-herbal-green-tea",
        name: "AmaaShop Herbal Green Tea",
        price: 199,
        quantity: 2,
        image_url: "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=900&q=75",
      },
      {
        product_id: "prod-neem-turmeric-soap",
        name: "AmaaShop Handmade Neem & Turmeric Soap",
        price: 75,
        quantity: 3,
        image_url: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=75",
      },
    ],
    subtotal: 623,
    shipping: 0,
    total: 623,
    status: "delivered",
    created_at: new Date(Date.now() - 3 * 86400e3).toISOString(),
  },
  {
    id: "AMA-ORD-9104",
    customer_name: "Rahul Sharma",
    customer_email: "udaykantp9199@gmail.com",
    customer_phone: "+91 98765 43210",
    shipping_address: "Flat 402, Green View Apartments, Indiranagar",
    city: "Bengaluru",
    zip_code: "560038",
    items: [
      {
        product_id: "prod-a2-cow-ghee",
        name: "AmaaShop A2 Cow Ghee",
        price: 579,
        quantity: 1,
        image_url: "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-ghee.png",
      },
    ],
    subtotal: 579,
    shipping: 0,
    total: 579,
    status: "shipped",
    created_at: new Date(Date.now() - 1 * 86400e3).toISOString(),
  },
];

// In-memory order store
const globalForOrders = globalThis as unknown as { inMemoryOrders?: Order[] };
if (!globalForOrders.inMemoryOrders) {
  globalForOrders.inMemoryOrders = [...INITIAL_MOCK_ORDERS];
}

export function saveMockOrder(order: Order): void {
  globalForOrders.inMemoryOrders?.unshift(order);
}

/** Deliberately uncached: order status lookup */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const norm = orderId.trim().toUpperCase();
  const found = globalForOrders.inMemoryOrders?.find(
    (o) => o.id.toUpperCase() === norm || o.id.toUpperCase().startsWith(norm),
  );
  return found ?? globalForOrders.inMemoryOrders?.[0] ?? null;
}

/** Order history for the signed-in user, matched by email */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const list = globalForOrders.inMemoryOrders ?? [];
  const matched = list.filter((o) => o.customer_email.toLowerCase() === email.toLowerCase());
  return matched.length ? matched : list.slice(0, 2);
}

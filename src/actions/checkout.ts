"use server";

import { z } from "zod";
import { EXPRESS_SHIPPING, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from "@/lib/checkout/pricing";
import { Collections, collection, db, nowSentinel } from "@/server/firestore";
import type { GuestOrderDoc, GuestOrderItem, ProductDoc } from "@/server/models";
import type { OrderItem } from "@/lib/types";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  address: z.string().trim().min(1, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(200),
  zip: z.string().trim().min(1, "ZIP code is required").max(20),
  deliveryOption: z.enum(["standard", "express"]),
  items: z
    // Catalog IDs are Firestore document ids, not UUIDs.
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty"),
});

export type PlaceOrderInput = z.infer<typeof checkoutSchema>;
export type PlaceOrderResult = { success: true; orderId: string } | { success: false; error: string };

/**
 * Places a storefront order. Price and stock are re-fetched from the
 * authoritative catalog (Firestore — the same source the storefront and admin
 * read) and the total is recomputed here; the client's cart is only ever a UI
 * hint. The order row is written to the `guest_orders` collection (migrated
 * from the old Supabase `orders` table), which the confirmation page and
 * order history read.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details and try again.",
    };
  }
  const { items, deliveryOption, ...customer } = parsed.data;

  const firestore = db();
  const productIds = [...new Set(items.map((i) => i.productId))];
  const productSnaps = await firestore.getAll(...productIds.map((id) => firestore.collection(Collections.products).doc(id)));
  const productsById = new Map(
    productSnaps.filter((s) => s.exists && (s.data() as ProductDoc).status === "ACTIVE").map((s) => [s.id, s.data() as ProductDoc]),
  );

  if (productsById.size !== productIds.length) {
    return { success: false, error: "One or more items in your cart are no longer available." };
  }

  const stockByProduct = new Map<string, number>();
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const snap = await firestore.collection(Collections.inventoryItems).where("productId", "in", chunk).get();
    for (const d of snap.docs) {
      const item = d.data() as { productId: string; qtyAvailable: number };
      stockByProduct.set(item.productId, (stockByProduct.get(item.productId) ?? 0) + item.qtyAvailable);
    }
  }

  const orderItems: OrderItem[] = [];
  let subtotal = 0;
  for (const { productId, quantity } of items) {
    const product = productsById.get(productId);
    if (!product) {
      return { success: false, error: "One or more items in your cart are no longer available." };
    }

    // No inventory rows tracked => sellable; rows summing to 0 => out of stock.
    const stock = stockByProduct.has(productId) ? (stockByProduct.get(productId) ?? 0) : Number.POSITIVE_INFINITY;
    if (stock < quantity) {
      return { success: false, error: `${product.name} only has ${stock} left in stock.` };
    }

    const price = Number(product.sellingPrice);
    const image = product.imageUrl || (product.images?.[0] ?? "");

    orderItems.push({ product_id: productId, name: product.name, price, quantity, image_url: image });
    subtotal += price * quantity;
  }

  const shipping = deliveryOption === "express" ? EXPRESS_SHIPPING : subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const data: GuestOrderDoc = {
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    shipping_address: customer.address,
    city: customer.city,
    zip_code: customer.zip,
    items: orderItems as GuestOrderItem[],
    subtotal,
    shipping,
    total,
    status: "pending",
    created_at: nowSentinel(),
  };

  try {
    const ref = await collection(Collections.guestOrders).add(data);
    return { success: true, orderId: ref.id };
  } catch {
    return { success: false, error: "Something went wrong placing your order. Please try again." };
  }
}

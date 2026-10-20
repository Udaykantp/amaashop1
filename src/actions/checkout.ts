"use server";

import { z } from "zod";
import { EXPRESS_SHIPPING, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from "@/lib/checkout/pricing";
import { getMockProductById } from "@/lib/data/mock-catalog";
import { saveMockOrder } from "@/lib/data/orders";
import type { Order, OrderItem } from "@/lib/types";

// DATABASE COMMENTED OUT — USING MOCK DATA
// import { Collections, collection, db, nowSentinel } from "@/server/firestore";
// import type { GuestOrderDoc, GuestOrderItem, ProductDoc } from "@/server/models";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  address: z.string().trim().min(1, "Address is required").max(500),
  city: z.string().trim().min(1, "City is required").max(200),
  zip: z.string().trim().min(1, "ZIP code is required").max(20),
  deliveryOption: z.enum(["standard", "express"]),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty"),
});

export type PlaceOrderInput = z.infer<typeof checkoutSchema>;
export type PlaceOrderResult = { success: true; orderId: string } | { success: false; error: string };

/**
 * Places a storefront order using in-memory mock store.
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

  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  for (const { productId, quantity } of items) {
    const product = getMockProductById(productId);
    if (!product) {
      return { success: false, error: "One or more items in your cart are no longer available." };
    }

    const price = product.price;
    const image = product.image_url;

    orderItems.push({ product_id: productId, name: product.name, price, quantity, image_url: image });
    subtotal += price * quantity;
  }

  const shipping = deliveryOption === "express" ? EXPRESS_SHIPPING : subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const orderId = `AMA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const orderRecord: Order = {
    id: orderId,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    shipping_address: customer.address,
    city: customer.city,
    zip_code: customer.zip,
    items: orderItems,
    subtotal,
    shipping,
    total,
    status: "processing",
    created_at: new Date().toISOString(),
  };

  saveMockOrder(orderRecord);

  return { success: true, orderId };
}

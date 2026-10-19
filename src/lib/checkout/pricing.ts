export const FREE_SHIPPING_THRESHOLD = 1000;
export const STANDARD_SHIPPING = 100;
export const EXPRESS_SHIPPING = 150;
export const TAX_RATE = 0.08;

export type DeliveryOption = "standard" | "express";

/**
 * Shared by the client (live order-summary preview) and the
 * `placeOrderAction` Server Action (the actual charge) so they can never
 * drift apart — the action is still the source of truth since it
 * recomputes this itself from server-fetched prices, not whatever the
 * client displayed.
 */
export function estimateTotals(subtotal: number, deliveryOption: DeliveryOption) {
  const shipping =
    deliveryOption === "express" ? EXPRESS_SHIPPING : subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const tax = subtotal * TAX_RATE;
  return { shipping, tax, total: subtotal + shipping + tax };
}

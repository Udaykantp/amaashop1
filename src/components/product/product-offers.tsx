import { BadgePercent, Tag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";

/**
 * Store-wide offers (not per-product coupon codes — the catalog has none).
 * Kept truthful: these mirror real thresholds used at checkout and in the
 * newsletter sign-up.
 */
const OFFERS = [
  `Free delivery on orders above ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
  "Get 10% off your first order when you subscribe to the newsletter",
  "Pay on Delivery available on eligible pincodes",
  "No-questions-asked 7-day replacement",
];

export function ProductOffers() {
  return (
    <section className="mt-5 rounded-xl border border-neutral-200 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
        <BadgePercent size={16} className="text-emerald-600" />
        Available offers
      </h2>
      <ul className="mt-2.5 space-y-2">
        {OFFERS.map((offer) => (
          <li key={offer} className="flex gap-2 text-sm text-neutral-600">
            <Tag size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{offer}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

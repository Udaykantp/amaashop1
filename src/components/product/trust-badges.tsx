import { BadgeCheck, Banknote, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";

const ITEMS = [
  {
    icon: Truck,
    title: "Free delivery",
    text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
  },
  { icon: RotateCcw, title: "7-day replacement", text: "For damaged or wrong items" },
  { icon: ShieldCheck, title: "Secure payments", text: "Encrypted checkout" },
  { icon: BadgeCheck, title: "100% genuine", text: "From authorised sellers" },
  { icon: Banknote, title: "Pay on delivery", text: "On eligible pincodes" },
];

export function TrustBadges() {
  return (
    <section className="mt-6 border-t border-neutral-100 pt-5">
      <h2 className="text-sm font-semibold text-neutral-900">Why shop with us</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <item.icon size={18} />
            </span>
            <span>
              <span className="block text-sm font-medium text-neutral-800">{item.title}</span>
              <span className="block text-xs text-neutral-500">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

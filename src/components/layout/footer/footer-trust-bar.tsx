import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";

const ITEMS = [
  { icon: Truck, title: "Free Delivery", text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: ShieldCheck, title: "Secure Checkout", text: "Your data is encrypted in transit" },
  { icon: RotateCcw, title: "Easy Returns", text: "Hassle-free return process" },
  { icon: Headphones, title: "Always Here", text: "Reach us any time via Contact" },
];

export function FooterTrustBar() {
  return (
    <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-6 sm:grid-cols-4 sm:gap-4">
      {ITEMS.map((item) => (
        <div key={item.title} className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-emerald-400">
            <item.icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white sm:text-sm">{item.title}</p>
            <p className="truncate text-[11px] text-neutral-400 sm:text-xs">{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

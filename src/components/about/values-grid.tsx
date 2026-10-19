import { Award, Heart, Leaf, Shield, Truck, Users } from "lucide-react";
import { CurrencyPrice } from "@/components/about/currency-price";
import { CurrencySwitcher } from "@/components/about/currency-switcher";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";

const VALUES = [
  { icon: Leaf, title: "Freshness First", text: "We source daily from local farms to ensure maximum freshness in every order." },
  { icon: Shield, title: "Quality Guaranteed", text: "Every product undergoes strict quality checks before reaching your door." },
  { icon: Truck, title: "Fast Delivery", text: "Same-day delivery available. Free shipping on orders over ", freeShippingThreshold: FREE_SHIPPING_THRESHOLD },
  { icon: Heart, title: "Customer Care", text: "Your satisfaction is our priority. 24/7 support whenever you need us." },
  { icon: Users, title: "Community Focus", text: "We support local farmers and give back to the communities we serve." },
  { icon: Award, title: "Best Prices", text: "Competitive pricing with regular deals and discounts on your favorites." },
];

export function ValuesGrid() {
  return (
    <section className="bg-neutral-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
          <h2 className="text-center text-2xl font-bold text-neutral-800">Our Values</h2>
          <CurrencySwitcher />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="rounded-xl border border-neutral-100 bg-white p-6 text-center transition-shadow hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <value.icon size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-800">{value.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">
                {value.text}
                {value.freeShippingThreshold && <CurrencyPrice amount={value.freeShippingThreshold} />}
                {value.freeShippingThreshold && "."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

const PROMOS = [
  {
    id: "fruits",
    eyebrow: "Limited Time",
    title: "Fresh Fruits Sale",
    text: "Up to 30% off on all fresh fruits",
    cta: "Shop Now",
    href: "/shop?category=Fruits%20%26%20Vegetables",
    from: "from-amber-400",
    to: "to-orange-500",
    ctaColor: "text-orange-600",
    image: "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&h=350&w=500",
  },
  {
    id: "bakery",
    eyebrow: "New Arrivals",
    title: "Bakery Specials",
    text: "Fresh baked goods every morning",
    cta: "Discover",
    href: "/shop?category=Breads%20%26%20Bakery",
    from: "from-emerald-500",
    to: "to-teal-600",
    ctaColor: "text-emerald-600",
    image: "https://images.pexels.com/photos/5567093/pexels-photo-5567093.jpeg?auto=compress&cs=tinysrgb&h=350&w=500",
  },
];

export function PromoBanner() {
  return (
    <section className="px-3 py-5 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-8">
      <div className="flex gap-3 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible">
        {PROMOS.map((promo) => (
          <div
            key={promo.id}
            className={`relative w-[280px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${promo.from} ${promo.to} p-5 lg:w-auto lg:p-8`}
          >
            <div className="relative z-10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90 lg:text-xs">
                {promo.eyebrow}
              </span>
              <h3 className="mt-2 text-xl font-bold text-white lg:text-2xl">{promo.title}</h3>
              <p className="mt-1 text-xs text-white/90 lg:text-sm">{promo.text}</p>
              <Link
                href={promo.href}
                className={`mt-3 inline-block rounded-lg bg-white px-4 py-1.5 text-xs font-semibold ${promo.ctaColor} transition-transform hover:scale-105 lg:mt-4 lg:px-5 lg:py-2 lg:text-sm`}
              >
                {promo.cta}
              </Link>
            </div>
            {/* `fill` fills its nearest positioned ancestor — sizing that
                wrapper (not the image's own style) is what next/image
                requires; it throws if `fill` is combined with style.width. */}
            <div className="absolute right-0 top-0 h-full w-1/2">
              <Image src={promo.image} alt="" fill sizes="140px" className="object-cover opacity-30" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

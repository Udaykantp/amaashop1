import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";

export function ProductRow({
  title,
  subtitle,
  eyebrow,
  products,
  seeAllHref,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  products: Product[];
  seeAllHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="px-3 py-5 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Flame size={12} className="fill-emerald-600 text-emerald-600" />
              {eyebrow}
            </span>
          ) : null}
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 lg:text-2xl">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-neutral-500 lg:text-sm">{subtitle}</p>
          ) : null}
        </div>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 lg:text-sm"
          >
            See all
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 3} />
        ))}
      </div>
    </section>
  );
}

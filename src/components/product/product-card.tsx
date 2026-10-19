import Image from "next/image";
import Link from "next/link";
import { QuickAdd } from "@/components/product/quick-add";
import { RatingStars } from "@/components/product/rating-stars";
import { WishlistToggleButton } from "@/components/product/wishlist-toggle-button";
import { calculateDiscount, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Storefront product card — used in grids of 6–20+ (Home, Shop, Search,
 * Related). The card body is a Server Component; only the small <QuickAdd>
 * button ships client JS.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const discount = calculateDiscount(product.price, product.old_price);
  const save = product.old_price ? Math.max(0, product.old_price - product.price) : 0;
  const outOfStock = product.stock === 0;
  const href = `/product/${product.slug}`;

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-neutral-100 bg-white p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-200 hover:shadow-md">
      <WishlistToggleButton product={product} variant="card" />
      <Link
        href={href}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden rounded-xl bg-neutral-50"
      >
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
          priority={priority}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            −{discount}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 grid place-items-center bg-white/65 text-xs font-semibold uppercase tracking-wide text-neutral-600 backdrop-blur-[1px]">
            Out of stock
          </span>
        )}
      </Link>

      <div className="mt-2.5 flex flex-1 flex-col">
        {product.categories?.name ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            {product.categories.name}
          </p>
        ) : null}

        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-neutral-800">
          <Link href={href} className="line-clamp-2 hover:text-emerald-700">
            {product.name}
          </Link>
        </h3>

        {product.reviews > 0 ? (
          <div className="mt-1">
            <RatingStars rating={product.rating} reviews={product.reviews} size="sm" />
          </div>
        ) : null}

        {product.unit ? <p className="mt-0.5 text-xs text-neutral-500">{product.unit}</p> : null}

        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-base font-bold text-neutral-900">{formatPrice(product.price)}</span>
            {product.old_price ? (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.old_price)}
              </span>
            ) : null}
            {save > 0 ? (
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Save {formatPrice(save)}
              </span>
            ) : null}
          </div>
          <QuickAdd product={product} />
        </div>
      </div>
    </div>
  );
}

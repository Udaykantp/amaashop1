import { Star } from "lucide-react";
import { RatingStars } from "@/components/product/rating-stars";
import { calculateDiscount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicProductDetail } from "@/lib/data/products";

const nf = new Intl.NumberFormat("en-IN");

export function ProductInfo({ product }: { product: PublicProductDetail }) {
  const discount = calculateDiscount(product.price, product.old_price);
  const save = product.old_price ? Math.max(0, product.old_price - product.price) : 0;
  const hasRatings = product.reviews > 0;

  return (
    <>
      {product.brand && (
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {product.brand}
        </p>
      )}

      <h1 className="mt-1 text-xl font-bold leading-snug text-neutral-900 md:text-2xl">
        {product.name}
      </h1>

      {product.subtitle && (
        <p className="mt-1 text-sm text-neutral-500">{product.subtitle}</p>
      )}

      {/* Rating pill */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {hasRatings ? (
          <>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {product.rating.toFixed(1)}
              <Star size={12} className="fill-white" />
            </span>
            <span className="text-sm font-medium text-neutral-500">
              {nf.format(product.reviews)} Ratings &amp; Reviews
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <RatingStars rating={0} size="md" />
            <span className="text-sm text-neutral-400">No ratings yet</span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-bold text-neutral-900 lg:text-3xl">
          {formatPrice(product.price)}
        </span>
        {product.old_price && (
          <span className="text-base text-neutral-400 line-through">
            {formatPrice(product.old_price)}
          </span>
        )}
        {discount > 0 && (
          <span className="text-base font-semibold text-emerald-600">{discount}% off</span>
        )}
        {product.unit && <span className="text-sm text-neutral-500">/ {product.unit}</span>}
      </div>

      <p className="mt-1 text-xs text-neutral-400">Inclusive of all taxes</p>

      {save > 0 && (
        <div
          className={cn(
            "mt-3 inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700",
          )}
        >
          You save {formatPrice(save)} on this order
        </div>
      )}

      <div
        className={cn(
          "mt-3 text-sm font-medium",
          product.stock > 0 ? "text-emerald-600" : "text-red-500",
        )}
      >
        {product.stock > 0
          ? product.stock <= 10
            ? `Hurry, only ${product.stock} left in stock`
            : "In stock"
          : "Currently out of stock"}
      </div>
    </>
  );
}

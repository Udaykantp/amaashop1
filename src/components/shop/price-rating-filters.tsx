"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRICE_RANGE_MAX } from "@/lib/shop/filter-products";
import { buildShopUrl } from "@/lib/shop/build-shop-url";
import { cn } from "@/lib/utils";

const RATING_OPTIONS = [4, 3, 2, 1];

export function PriceRatingFilters({
  minPrice,
  maxPrice,
  minRating,
  inStockOnly,
  currentParams,
  onApplied,
}: {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  inStockOnly: boolean;
  currentParams: Record<string, string | undefined>;
  /** Called after navigating — lets a mobile sheet close itself. */
  onApplied?: () => void;
}) {
  const router = useRouter();
  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);

  const applyPriceRange = () => {
    router.push(
      buildShopUrl(currentParams, {
        minPrice: draftMin > 0 ? String(draftMin) : null,
        maxPrice: draftMax < PRICE_RANGE_MAX ? String(draftMax) : null,
      }),
    );
    onApplied?.();
  };

  const toggleRating = (rating: number) => {
    router.push(buildShopUrl(currentParams, { minRating: minRating === rating ? null : String(rating) }));
    onApplied?.();
  };

  const toggleInStock = (checked: boolean) => {
    router.push(buildShopUrl(currentParams, { inStock: checked ? "1" : null }));
    onApplied?.();
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-800">Price Range</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">₹</span>
            <input
              type="number"
              value={draftMin}
              min={0}
              onChange={(e) => setDraftMin(Number(e.target.value))}
              onBlur={applyPriceRange}
              className="w-full rounded-lg border border-neutral-200 py-1.5 pl-6 pr-2 text-sm"
              aria-label="Minimum price"
            />
          </div>
          <span>-</span>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">₹</span>
            <input
              type="number"
              value={draftMax}
              max={PRICE_RANGE_MAX}
              onChange={(e) => setDraftMax(Number(e.target.value))}
              onBlur={applyPriceRange}
              className="w-full rounded-lg border border-neutral-200 py-1.5 pl-6 pr-2 text-sm"
              aria-label="Maximum price"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-800">Rating</h3>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRating(r)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                minRating === r ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              <Star size={12} className={minRating === r ? "fill-white" : "fill-amber-400 text-amber-400"} />
              {r}+ & above
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-800">Availability</h3>
        <label className="flex items-center gap-2 py-1 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => toggleInStock(e.target.checked)}
            className="h-4 w-4 rounded accent-emerald-500"
          />
          In Stock Only
        </label>
      </div>
    </>
  );
}

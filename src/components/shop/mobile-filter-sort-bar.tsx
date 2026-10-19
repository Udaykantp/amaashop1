"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryFilterList } from "@/components/shop/category-filter-list";
import { PriceRatingFilters } from "@/components/shop/price-rating-filters";
import { buildShopUrl } from "@/lib/shop/build-shop-url";
import { SORT_LABELS, type ShopFilters } from "@/lib/shop/filter-products";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MobileFilterSortBar({
  categories,
  filters,
  currentParams,
  resultCount,
  activeFilterCount,
}: {
  categories: Category[];
  filters: ShopFilters;
  currentParams: Record<string, string | undefined>;
  resultCount: number;
  activeFilterCount: number;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);

  return (
    <>
      <div className="sticky top-[108px] z-30 flex items-center gap-2 border-y border-neutral-100 bg-white/95 px-3 py-2 backdrop-blur-sm lg:hidden">
        <span className="text-xs text-neutral-500">{resultCount} items</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSheet("sort")}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 active:bg-neutral-50"
          >
            Sort
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setSheet("filter")}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 active:bg-neutral-50"
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {sheet === "filter" && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-overlay bg-black/40" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-sheet-up rounded-t-2xl bg-white pb-safe">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h2 className="text-base font-bold text-neutral-800">Filters</h2>
              <button onClick={() => setSheet(null)} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-neutral-100" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-800">Categories</h3>
              <div className="mb-5">
                <CategoryFilterList
                  categories={categories}
                  activeCategory={filters.category}
                  currentParams={currentParams}
                  variant="chips"
                />
              </div>
              <PriceRatingFilters
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                minRating={filters.minRating}
                inStockOnly={filters.inStockOnly}
                currentParams={currentParams}
                onApplied={() => setSheet(null)}
              />
            </div>
            <div className="flex gap-3 border-t border-neutral-100 px-4 py-3 pb-safe">
              <Link
                href="/shop"
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-center text-sm font-semibold text-neutral-600 active:bg-neutral-50"
              >
                Clear All
              </Link>
              <button
                onClick={() => setSheet(null)}
                className="flex-[2] rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white active:bg-emerald-600"
              >
                Show {resultCount} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {sheet === "sort" && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-overlay bg-black/40" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 animate-sheet-up rounded-t-2xl bg-white pb-safe">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h2 className="text-base font-bold text-neutral-800">Sort By</h2>
              <button onClick={() => setSheet(null)} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-neutral-100" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="py-2">
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    router.push(buildShopUrl(currentParams, { sort: value }));
                    setSheet(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium",
                    filters.sort === value ? "text-emerald-600" : "text-neutral-700",
                  )}
                >
                  {label}
                  {filters.sort === value && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

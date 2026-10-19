import Link from "next/link";
import { CategoryFilterList } from "@/components/shop/category-filter-list";
import { PriceRatingFilters } from "@/components/shop/price-rating-filters";
import type { Category } from "@/lib/types";
import type { ShopFilters } from "@/lib/shop/filter-products";

export function DesktopFilterSidebar({
  categories,
  filters,
  currentParams,
  showClear,
}: {
  categories: Category[];
  filters: ShopFilters;
  currentParams: Record<string, string | undefined>;
  showClear: boolean;
}) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-800">Categories</h3>
        <CategoryFilterList categories={categories} activeCategory={filters.category} currentParams={currentParams} />
      </div>

      <PriceRatingFilters
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        minRating={filters.minRating}
        inStockOnly={filters.inStockOnly}
        currentParams={currentParams}
      />

      {showClear && (
        <Link
          href="/shop"
          className="block w-full rounded-lg border border-neutral-200 py-2 text-center text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Clear All Filters
        </Link>
      )}
    </div>
  );
}

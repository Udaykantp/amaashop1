import type { Product } from "@/lib/types";

// No "server-only" guard here on purpose: every function in this module is
// a pure, side-effect-free transform (no DB access, no secrets) — the Shop
// page uses it server-side, and client components like SortSelect need to
// import its shared types/constants (SORT_LABELS, PRICE_RANGE_MAX).

export type SortOption = "featured" | "price-low" | "price-high" | "rating" | "newest";

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "price-low": "Price: Low to High",
  "price-high": "Price: High to Low",
  rating: "Highest Rated",
  newest: "Newest",
};

export const PRICE_RANGE_MAX = 8000;

export interface ShopFilters {
  category: string;
  query: string;
  sort: SortOption;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  inStockOnly: boolean;
}

const SORT_VALUES = new Set<string>(Object.keys(SORT_LABELS));

/** Parses raw `searchParams` into a typed, defaulted filter object — the
 * single place that decides what's a valid filter value, so the page and
 * every filter component agree on defaults without repeating the logic. */
export function parseShopFilters(searchParams: Record<string, string | string[] | undefined>): ShopFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const sortParam = get("sort");
  const sort: SortOption = sortParam && SORT_VALUES.has(sortParam) ? (sortParam as SortOption) : "featured";

  return {
    category: get("category") ?? "",
    query: get("q") ?? "",
    sort,
    minPrice: Number(get("minPrice")) || 0,
    maxPrice: Number(get("maxPrice")) || PRICE_RANGE_MAX,
    minRating: Number(get("minRating")) || 0,
    inStockOnly: get("inStock") === "1",
  };
}

export function filterAndSortProducts(products: Product[], filters: ShopFilters): Product[] {
  let result = products;

  if (filters.category) {
    result = result.filter((p) => p.categories?.name === filters.category);
  }
  if (filters.query) {
    const lower = filters.query.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower),
    );
  }
  result = result.filter((p) => p.price >= filters.minPrice && p.price <= filters.maxPrice);
  if (filters.minRating > 0) result = result.filter((p) => p.rating >= filters.minRating);
  if (filters.inStockOnly) result = result.filter((p) => p.stock > 0);

  const sorted = [...result];
  switch (filters.sort) {
    case "price-low":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    default:
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }

  return sorted;
}

export function hasActiveFilters(filters: ShopFilters): boolean {
  return (
    !!filters.category ||
    !!filters.query ||
    filters.minRating > 0 ||
    filters.inStockOnly ||
    filters.minPrice > 0 ||
    filters.maxPrice < PRICE_RANGE_MAX
  );
}

export function activeFilterCount(filters: ShopFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.minPrice > 0 || filters.maxPrice < PRICE_RANGE_MAX ? 1 : 0)
  );
}

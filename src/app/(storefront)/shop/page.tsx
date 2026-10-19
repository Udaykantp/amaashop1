import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/product/product-card";
import { DesktopFilterSidebar } from "@/components/shop/desktop-filter-sidebar";
import { MobileFilterSortBar } from "@/components/shop/mobile-filter-sort-bar";
import { SortSelect } from "@/components/shop/sort-select";
import Link from "next/link";
import { getCategories } from "@/lib/data/categories";
import { getAllProducts } from "@/lib/data/products";
import {
  activeFilterCount,
  filterAndSortProducts,
  hasActiveFilters,
  parseShopFilters,
  PRICE_RANGE_MAX,
} from "@/lib/shop/filter-products";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { SITE_NAME } from "@/lib/constants";

// Per-request render against Cloud SQL — no DB at build time.
export const dynamic = "force-dynamic";

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Map a category *name* (what the shop filters on) to its clean slug. */
async function categorySlugForName(name: string): Promise<string | null> {
  if (!name) return null;
  const cats = await getCategories();
  return cats.find((c) => c.name === name)?.slug ?? null;
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const raw = await searchParams;
  const filters = parseShopFilters(raw);

  // A plain category view fully duplicates the clean /category/<slug> route —
  // canonicalise to it and keep this variant out of the index.
  const categorySlug = filters.category ? await categorySlugForName(filters.category) : null;
  const canonical = categorySlug ? `/category/${categorySlug}` : "/shop";

  const title = filters.query
    ? `Search results for "${filters.query}"`
    : filters.category
      ? `${filters.category} — Buy Online`
      : "Shop All Products";

  const description = filters.query
    ? `Search results for "${filters.query}" at ${SITE_NAME}.`
    : filters.category
      ? `Shop ${filters.category} from ${SITE_NAME} — genuine herbal and everyday essentials at honest prices, delivered across India.`
      : `Browse the full ${SITE_NAME} catalog — herbal personal care, natural home care, tea, pooja items and groceries, delivered across India.`;

  // Index only the bare /shop. Category views defer to /category/<slug>;
  // filtered / sorted / searched views are refinements, not distinct pages.
  const shouldNoindex =
    Boolean(filters.category) ||
    Boolean(filters.query) ||
    filters.sort !== "featured" ||
    filters.minPrice > 0 ||
    filters.maxPrice < PRICE_RANGE_MAX ||
    filters.minRating > 0 ||
    filters.inStockOnly;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: canonical },
    robots: shouldNoindex ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const raw = await searchParams;
  const filters = parseShopFilters(raw);

  const currentParams: Record<string, string | undefined> = {
    category: filters.category || undefined,
    q: filters.query || undefined,
    sort: filters.sort !== "featured" ? filters.sort : undefined,
    minPrice: filters.minPrice > 0 ? String(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice < 8000 ? String(filters.maxPrice) : undefined,
    minRating: filters.minRating > 0 ? String(filters.minRating) : undefined,
    inStock: filters.inStockOnly ? "1" : undefined,
  };

  const [categories, allProducts] = await Promise.all([getCategories(), getAllProducts()]);
  const products = filterAndSortProducts(allProducts, filters);
  const showClear = hasActiveFilters(filters);
  const filterCount = activeFilterCount(filters);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    ...(filters.category ? [{ name: filters.category, url: `/shop?category=${encodeURIComponent(filters.category)}` }] : []),
  ];

  const collectionName = filters.category
    ? `${filters.category} — ${SITE_NAME}`
    : `Shop all products — ${SITE_NAME}`;
  const collectionUrl = filters.category
    ? `/shop?category=${encodeURIComponent(filters.category)}`
    : "/shop";

  return (
    <div className="mx-auto max-w-7xl px-0 py-0 lg:px-8 lg:py-8">
      <JsonLd data={breadcrumbSchema(breadcrumbItems)} />
      {products.length > 0 && !filters.query && (
        <JsonLd
          data={collectionPageSchema({
            name: collectionName,
            description: `Browse ${products.length} ${filters.category ?? "products"} at ${SITE_NAME}.`,
            url: collectionUrl,
            products,
          })}
        />
      )}

      <nav className="hidden px-8 text-sm text-neutral-500 lg:mb-6 lg:block" aria-label="Breadcrumb">
        <span>Home</span>
        <span className="mx-2">/</span>
        <span className="text-neutral-800">Shop</span>
        {filters.category && (
          <>
            <span className="mx-2">/</span>
            <span className="text-emerald-600">{filters.category}</span>
          </>
        )}
      </nav>

      <div className="px-3 pt-4 lg:px-0">
        <h1 className="text-lg font-bold text-neutral-800 lg:text-2xl">
          {filters.query ? `Results for "${filters.query}"` : filters.category || "All Products"}
        </h1>
      </div>

      {filters.category && (
        <div className="px-3 py-2 lg:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
          >
            {filters.category} ✕
          </Link>
        </div>
      )}

      <MobileFilterSortBar
        categories={categories}
        filters={filters}
        currentParams={currentParams}
        resultCount={products.length}
        activeFilterCount={filterCount}
      />

      <div className="hidden items-center justify-between px-8 lg:flex">
        <p className="text-sm text-neutral-500">
          Showing {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <SortSelect currentSort={filters.sort} currentParams={currentParams} />
      </div>

      <div className="mt-4 flex gap-6 px-3 lg:px-8">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:w-60 lg:flex-shrink-0 lg:self-start">
          <DesktopFilterSidebar categories={categories} filters={filters} currentParams={currentParams} showClear={showClear} />
        </aside>

        <div className="flex-1 pb-4">
          {products.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <p className="text-lg font-semibold text-neutral-700">No products found</p>
              <p className="mt-1 text-sm text-neutral-500">Try adjusting your filters or search terms</p>
              {showClear && (
                <Link href="/shop" className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white">
                  Clear Filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

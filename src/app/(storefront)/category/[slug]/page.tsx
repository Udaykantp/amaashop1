import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/product/product-card";
import { CategorySort } from "@/components/shop/category-sort";
import { getCategories, getCategory } from "@/lib/data/categories";
import { getProductsForCategoryPage } from "@/lib/data/products";
import { PRICE_RANGE_MAX, SORT_LABELS, filterAndSortProducts, type SortOption } from "@/lib/shop/filter-products";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/seo/schema";
import { categoryContent } from "@/lib/catalog/category-content";
import { SITE_NAME } from "@/lib/constants";

// Per-request against Cloud SQL — no DB at build time.
export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateStaticParams() {
  try {
    return (await getCategories()).map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };

  const content = categoryContent(category.slug, category.name);
  return {
    title: `${category.name} — Buy Online`,
    description: content.metaDescription,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: `${category.name} — ${SITE_NAME}`,
      description: content.metaDescription,
      url: `/category/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const sort: SortOption = (Object.keys(SORT_LABELS) as SortOption[]).includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : "featured";

  const all = await getProductsForCategoryPage(category.slug);
  const products = filterAndSortProducts(all, {
    category: "",
    query: "",
    sort,
    minPrice: 0,
    maxPrice: PRICE_RANGE_MAX,
    minRating: 0,
    inStockOnly: false,
  });

  const content = categoryContent(category.slug, category.name);
  const basePath = `/category/${category.slug}`;
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: category.name, url: basePath },
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-8">
      <JsonLd data={breadcrumbSchema(crumbs)} />
      {products.length > 0 && (
        <JsonLd
          data={collectionPageSchema({
            name: `${category.name} — ${SITE_NAME}`,
            description: content.metaDescription,
            url: basePath,
            products,
          })}
        />
      )}

      <nav className="mb-4 text-sm text-neutral-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-neutral-800">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-neutral-800">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-emerald-600">{category.name}</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold text-neutral-900 lg:text-3xl">
          {category.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{content.intro}</p>
      </header>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <CategorySort basePath={basePath} currentSort={sort} />
      </div>

      {products.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold text-neutral-700">Nothing here yet</p>
          <p className="mt-1 text-sm text-neutral-500">New {category.name.toLowerCase()} products are on the way.</p>
          <Link href="/shop" className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white">
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="mt-10 text-sm text-neutral-500">
        Looking for something specific?{" "}
        <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className="font-medium text-emerald-600 hover:underline">
          Filter {category.name} by price &amp; rating
        </Link>
      </p>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { HeroBanner } from "@/components/home/hero-banner";
import { TopCategories } from "@/components/home/top-categories";
import { ProductRow } from "@/components/home/product-row";
import { PromoBanner } from "@/components/home/promo-banner";
import { CategorySkeleton, ProductRowSkeleton } from "@/components/skeletons/product-skeletons";
import { getCategories } from "@/lib/data/categories";
import {
  getBreakfastProducts,
  getFeaturedProducts,
  getLatestProducts,
  getPopularProducts,
} from "@/lib/data/products";

// Rendered per request against Cloud SQL. The build environment has no
// database, so this route must not be statically prerendered. Re-introduce
// ISR (`revalidate`) once there is a build-time-reachable data source.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Home targets the brand + core category terms; the layout template adds
  // "| AmaaShop", so keep this focused on the value proposition.
  title: {
    absolute:
      "AmaaShop — Herbal Personal Care, Natural Home Care & Everyday Essentials",
  },
  description:
    "Shop AmaaShop for genuine herbal personal care, natural home care, tea, pooja items and groceries. Honest prices, fast delivery across India.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AmaaShop — Herbal & Everyday Essentials",
    description:
      "Genuine herbal personal care, natural home care, tea, pooja items and groceries — delivered across India.",
    url: "/",
  },
};

async function CategoriesSection() {
  const categories = await getCategories();
  return <TopCategories categories={categories} />;
}

async function PopularSection() {
  const products = await getPopularProducts();
  return (
    <ProductRow
      eyebrow="Today's offers"
      title="Popular Products"
      subtitle="Do not miss the current offers"
      products={products}
      seeAllHref="/shop?sort=rating"
    />
  );
}

async function LatestSection() {
  const products = await getLatestProducts();
  return (
    <ProductRow
      title="New Arrivals"
      subtitle="Fresh on the shelves this week"
      products={products}
      seeAllHref="/shop?sort=newest"
    />
  );
}

async function FeaturedSection() {
  const products = await getFeaturedProducts();
  return (
    <ProductRow
      title="Featured Picks"
      subtitle="Handpicked by the AmaaShop team"
      products={products}
      seeAllHref="/shop"
    />
  );
}

async function BreakfastSection() {
  const products = await getBreakfastProducts();
  return (
    <ProductRow
      title="Dairy & Eggs"
      subtitle="Fresh from the farm, every morning"
      products={products}
      seeAllHref="/shop?category=Dairy%20%26%20Eggs"
    />
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col animate-page-enter">
      <HeroBanner />

      <Suspense
        fallback={
          <div className="px-3 py-6 lg:px-8">
            <CategorySkeleton />
          </div>
        }
      >
        <CategoriesSection />
      </Suspense>

      <Suspense fallback={<div className="px-3 py-6 lg:px-8"><ProductRowSkeleton count={6} /></div>}>
        <PopularSection />
      </Suspense>

      <PromoBanner />

      <Suspense fallback={<div className="px-3 py-6 lg:px-8"><ProductRowSkeleton count={6} /></div>}>
        <LatestSection />
      </Suspense>

      <Suspense fallback={<div className="px-3 py-6 lg:px-8"><ProductRowSkeleton count={6} /></div>}>
        <FeaturedSection />
      </Suspense>

      <Suspense fallback={<div className="px-3 py-6 lg:px-8"><ProductRowSkeleton count={6} /></div>}>
        <BreakfastSection />
      </Suspense>
    </div>
  );
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getProductsForSitemap } from "@/lib/data/products";
import { getCategories } from "@/lib/data/categories";

// Queries Cloud SQL for slugs/categories — must render at request time, not
// during the build (no database there).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getProductsForSitemap().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/track-order`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Clean category routes — the canonical, indexable collection pages.
  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((c) => (c.productCount ?? 1) > 0)
    .map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    ...(p.image ? { images: [p.image] } : {}),
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

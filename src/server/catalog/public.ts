import "server-only";
import { unstable_cache } from "next/cache";
import { Collections, db } from "@/server/firestore";
import type { CategoryDoc, ProductDoc, ProductImageDoc, ProductReviewDoc } from "@/server/models";
import { discountPct } from "@/lib/catalog/seo";
import { CATEGORY_STOCK_IMAGES } from "@/lib/catalog/category-images";
import type { Category, Product } from "@/lib/types";

/**
 * Public (storefront) catalog reads — the authoritative source is Firestore.
 * Only `status = ACTIVE` products are ever returned. Shapes match the legacy
 * `Product` / `Category` interfaces so storefront components didn't need to
 * change.
 *
 * Wrapped in `unstable_cache` tagged `products` / `categories`; the admin
 * write actions call `revalidateTag("products")`.
 */

const PLACEHOLDER = "/placeholder-product.svg";

async function primaryImage(productId: string): Promise<string | null> {
  const snap = await db()
    .collection(Collections.products)
    .doc(productId)
    .collection("images")
    .orderBy("position", "asc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return (snap.docs[0]!.data() as ProductImageDoc).url;
}

async function inventoryTotal(productId: string): Promise<number | null> {
  const snap = await db().collection(Collections.inventoryItems).where("productId", "==", productId).get();
  if (snap.empty) return null; // not tracked -> treated as sellable (see toProduct)
  return snap.docs.reduce((n, d) => n + (d.data() as { qtyAvailable: number }).qtyAvailable, 0);
}

async function toProduct(id: string, r: ProductDoc, categoriesById: Map<string, CategoryDoc>): Promise<Product> {
  const price = Number(r.sellingPrice);
  const mrp = Number(r.mrp);
  const d = discountPct(mrp, price);
  const [image, stockTotal] = await Promise.all([r.imageUrl ? Promise.resolve(r.imageUrl) : primaryImage(id), inventoryTotal(id)]);
  // No inventory rows at all → inventory isn't being tracked for this SKU yet,
  // so treat it as sellable. Rows summing to 0 → genuinely out of stock.
  const stock = stockTotal ?? 999;
  const category = r.categoryId ? categoriesById.get(r.categoryId) : null;

  return {
    id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price,
    old_price: mrp > price ? mrp : null,
    image_url: image || PLACEHOLDER,
    category_id: r.categoryId,
    unit: r.unitLabel,
    stock,
    rating: Number(r.rating),
    reviews: r.reviews,
    badge: d >= 10 ? `${d}% OFF` : null,
    is_featured: r.isFeatured,
    is_popular: r.isPopular,
    is_latest: r.isLatest,
    created_at: r.createdAt.toDate().toISOString(),
    categories: category
      ? { id: r.categoryId!, name: category.name, slug: category.slug, icon: category.iconKey, sort_order: category.sortOrder }
      : null,
  };
}

async function hydrateProducts(rows: { id: string; data: ProductDoc }[]): Promise<Product[]> {
  const categoryIds = [...new Set(rows.map((r) => r.data.categoryId).filter((x): x is string => !!x))];
  const firestore = db();
  const categorySnaps = categoryIds.length
    ? await firestore.getAll(...categoryIds.map((id) => firestore.collection(Collections.categories).doc(id)))
    : [];
  const categoriesById = new Map(categorySnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as CategoryDoc]));
  return Promise.all(rows.map((r) => toProduct(r.id, r.data, categoriesById)));
}

// ── list reads ────────────────────────────────────────────────────────────

export const getActiveProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const snap = await db()
      .collection(Collections.products)
      .where("status", "==", "ACTIVE")
      .orderBy("isFeatured", "desc")
      .orderBy("updatedAt", "desc")
      .get();
    return hydrateProducts(snap.docs.map((d) => ({ id: d.id, data: d.data() as ProductDoc })));
  },
  ["public-active-products"],
  { revalidate: 300, tags: ["products"] },
);

export const getProductsByFlag = unstable_cache(
  async (flag: "popular" | "latest" | "featured", limit = 6): Promise<Product[]> => {
    let query = db().collection(Collections.products).where("status", "==", "ACTIVE");
    if (flag === "popular") query = query.where("isPopular", "==", true);
    if (flag === "latest") query = query.where("isLatest", "==", true);
    if (flag === "featured") query = query.where("isFeatured", "==", true);
    query = query.orderBy(flag === "latest" ? "publishedAt" : "updatedAt", "desc").limit(limit);
    const snap = await query.get();
    return hydrateProducts(snap.docs.map((d) => ({ id: d.id, data: d.data() as ProductDoc })));
  },
  ["public-products-by-flag"],
  { revalidate: 300, tags: ["products"] },
);

export const getProductsByCategorySlug = unstable_cache(
  async (slug: string, limit = 6): Promise<Product[]> => {
    const catSnap = await db().collection(Collections.categories).where("slug", "==", slug).limit(1).get();
    if (catSnap.empty) return [];
    const snap = await db()
      .collection(Collections.products)
      .where("status", "==", "ACTIVE")
      .where("categoryId", "==", catSnap.docs[0]!.id)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return hydrateProducts(snap.docs.map((d) => ({ id: d.id, data: d.data() as ProductDoc })));
  },
  ["public-products-by-category"],
  { revalidate: 300, tags: ["products"] },
);

export const getRelatedProductsPublic = unstable_cache(
  async (categoryId: string, excludeId: string, limit = 4): Promise<Product[]> => {
    const snap = await db()
      .collection(Collections.products)
      .where("status", "==", "ACTIVE")
      .where("categoryId", "==", categoryId)
      .orderBy("updatedAt", "desc")
      .limit(limit + 1)
      .get();
    const rows = snap.docs.filter((d) => d.id !== excludeId).slice(0, limit);
    return hydrateProducts(rows.map((d) => ({ id: d.id, data: d.data() as ProductDoc })));
  },
  ["public-related-products"],
  { revalidate: 300, tags: ["products"] },
);

export const getActiveProductSlugs = unstable_cache(
  async (): Promise<{ slug: string }[]> => {
    const snap = await db().collection(Collections.products).where("status", "==", "ACTIVE").get();
    return snap.docs.map((d) => ({ slug: (d.data() as ProductDoc).slug }));
  },
  ["public-product-slugs"],
  { revalidate: 3600, tags: ["products"] },
);

/** Slug + last-modified + primary image, for the XML sitemap (with image ext). */
export const getProductsForSitemap = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: Date; image: string | null }[]> => {
    const snap = await db().collection(Collections.products).where("status", "==", "ACTIVE").orderBy("updatedAt", "desc").get();
    return Promise.all(
      snap.docs.map(async (d) => {
        const r = d.data() as ProductDoc;
        return { slug: r.slug, updatedAt: r.updatedAt.toDate(), image: r.imageUrl || (await primaryImage(d.id)) };
      }),
    );
  },
  ["public-products-sitemap"],
  { revalidate: 3600, tags: ["products"] },
);

/**
 * Firestore has no cross-field `contains` search — over-fetches ACTIVE
 * products and filters in memory, same pattern used elsewhere in the admin
 * catalog. Fine at today's catalog size.
 */
export async function searchProductsPublic(query: string, limit = 24): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const snap = await db().collection(Collections.products).where("status", "==", "ACTIVE").get();
  const matched = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as ProductDoc }))
    .filter(
      (r) =>
        r.data.name.toLowerCase().includes(q) ||
        r.data.description?.toLowerCase().includes(q) ||
        r.data.brand?.toLowerCase().includes(q) ||
        r.data.tags.some((t) => t.toLowerCase() === q),
    )
    .sort((a, b) => (b.data.isFeatured ? 1 : 0) - (a.data.isFeatured ? 1 : 0))
    .slice(0, limit);
  return hydrateProducts(matched);
}

export async function getProductForCartPublic(id: string): Promise<Product | null> {
  const snap = await db().collection(Collections.products).doc(id).get();
  if (!snap.exists) return null;
  const r = snap.data() as ProductDoc;
  if (r.status !== "ACTIVE") return null;
  const [p] = await hydrateProducts([{ id, data: r }]);
  return p ?? null;
}

// ── detail read (rich — drives PDP SEO) ───────────────────────────────────

export interface PublicProductDetail extends Product {
  sku: string;
  brand: string | null;
  gtin: string | null;
  hsnCode: string | null;
  gstRateBps: number;
  pv: number;
  bv: number;
  weightGrams: number | null;
  images: { url: string; alt: string | null }[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  focusKeyword: string | null;
  subtitle: string | null;
}

export const getProductDetailBySlug = unstable_cache(
  async (slug: string): Promise<PublicProductDetail | null> => {
    const snap = await db().collection(Collections.products).where("slug", "==", slug).where("status", "==", "ACTIVE").limit(1).get();
    if (snap.empty) return null;
    const productDoc = snap.docs[0]!;
    const p = productDoc.data() as ProductDoc;

    const [imagesSnap, hydrated] = await Promise.all([
      productDoc.ref.collection("images").orderBy("position", "asc").get(),
      hydrateProducts([{ id: productDoc.id, data: p }]),
    ]);
    const base = hydrated[0]!;
    const images = imagesSnap.docs.map((d) => {
      const img = d.data() as ProductImageDoc;
      return { url: img.url, alt: img.alt };
    });

    return {
      ...base,
      sku: p.sku,
      brand: p.brand,
      gtin: p.gtin,
      hsnCode: p.hsnCode,
      gstRateBps: p.gstRateBps,
      pv: Number(p.pv),
      bv: Number(p.bv),
      weightGrams: p.weightGrams,
      subtitle: p.subtitle,
      images,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      ogImageUrl: p.ogImageUrl,
      canonicalUrl: p.canonicalUrl,
      noIndex: p.noIndex,
      focusKeyword: p.focusKeyword,
    };
  },
  ["public-product-detail"],
  { revalidate: 60, tags: ["products"] },
);

// ── categories ───────────────────────────────────────────────────────────

interface CategoryStats {
  count: number;
  /** Up to 2 real, distinct ACTIVE products' own `imageUrl` for this category
   *  — never stock/fake imagery. A category with several products gets a
   *  2-photo collage on its "Shop by category" tile instead of just one. */
  images: string[];
}

async function categoryProductStats(): Promise<Map<string, CategoryStats>> {
  const snap = await db().collection(Collections.products).where("status", "==", "ACTIVE").get();
  const stats = new Map<string, CategoryStats>();
  // One representative product id per category, kept in case nothing in that
  // category has `imageUrl` set directly on the doc (most products keep their
  // photos in the `images` subcollection instead — see `primaryImage`).
  const fallbackProductId = new Map<string, string>();

  for (const d of snap.docs) {
    const p = d.data() as ProductDoc;
    if (!p.categoryId) continue;
    const existing = stats.get(p.categoryId);
    if (existing) {
      existing.count += 1;
      if (existing.images.length < 2 && p.imageUrl && !existing.images.includes(p.imageUrl)) {
        existing.images.push(p.imageUrl);
      }
    } else {
      stats.set(p.categoryId, { count: 1, images: p.imageUrl ? [p.imageUrl] : [] });
    }
    if (!fallbackProductId.has(p.categoryId)) fallbackProductId.set(p.categoryId, d.id);
  }

  await Promise.all(
    Array.from(stats.entries()).map(async ([categoryId, s]) => {
      if (s.images.length > 0) return;
      const productId = fallbackProductId.get(categoryId);
      if (!productId) return;
      const img = await primaryImage(productId);
      if (img) s.images.push(img);
    }),
  );

  return stats;
}

export const getStorefrontCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const [snap, stats] = await Promise.all([
      db().collection(Collections.categories).orderBy("sortOrder", "asc").get(),
      categoryProductStats(),
    ]);
    return snap.docs.map((d) => {
      const c = d.data() as CategoryDoc;
      const s = stats.get(d.id);
      return {
        id: d.id,
        name: c.name,
        slug: c.slug,
        icon: c.iconKey,
        sort_order: c.sortOrder,
        productCount: s?.count ?? 0,
        // Real photos from actual ACTIVE products in this category always
        // win — it's the truthful "what you can actually buy" picture. The
        // curated photo in CATEGORY_STOCK_IMAGES is only a placeholder for a
        // category with no photographed product yet; it steps aside the
        // moment a real one exists. If a category shows the wrong real photo,
        // that means a product is mis-categorized or has the wrong image
        // attached in /admin/catalog — fix it there, not here.
        images: s?.images.length ? s.images : CATEGORY_STOCK_IMAGES[c.name] ? [CATEGORY_STOCK_IMAGES[c.name]!] : [],
      };
    });
  },
  ["storefront-categories"],
  { revalidate: 3600, tags: ["categories", "products"] },
);

/** Single category by slug (for the `/category/[slug]` route). */
export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const snap = await db().collection(Collections.categories).where("slug", "==", slug).limit(1).get();
    if (snap.empty) return null;
    const c = snap.docs[0]!.data() as CategoryDoc;
    const stats = await categoryProductStats();
    const s = stats.get(snap.docs[0]!.id);
    return {
      id: snap.docs[0]!.id,
      name: c.name,
      slug: c.slug,
      icon: c.iconKey,
      sort_order: c.sortOrder,
      productCount: s?.count ?? 0,
      images: s?.images.length ? s.images : CATEGORY_STOCK_IMAGES[c.name] ? [CATEGORY_STOCK_IMAGES[c.name]!] : [],
    };
  },
  ["storefront-category-by-slug"],
  { revalidate: 3600, tags: ["categories", "products"] },
);

/** All ACTIVE products in a category, sorted (for the `/category/[slug]` grid). */
export const getAllProductsInCategory = unstable_cache(
  async (slug: string): Promise<Product[]> => {
    const catSnap = await db().collection(Collections.categories).where("slug", "==", slug).limit(1).get();
    if (catSnap.empty) return [];
    const snap = await db()
      .collection(Collections.products)
      .where("status", "==", "ACTIVE")
      .where("categoryId", "==", catSnap.docs[0]!.id)
      .orderBy("isFeatured", "desc")
      .orderBy("updatedAt", "desc")
      .get();
    return hydrateProducts(snap.docs.map((d) => ({ id: d.id, data: d.data() as ProductDoc })));
  },
  ["public-products-in-category"],
  { revalidate: 300, tags: ["products"] },
);

// ── reviews ──────────────────────────────────────────────────────────────

export interface PublicReview {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedBuyer: boolean;
  createdAt: string;
}

/**
 * PUBLISHED reviews only — the sole source for storefront review display and
 * schema.org `Review` JSON-LD. Never fabricated; empty until real reviews land.
 */
export const getPublishedReviews = unstable_cache(
  async (productId: string, limit = 20): Promise<PublicReview[]> => {
    const snap = await db()
      .collection(Collections.products)
      .doc(productId)
      .collection("reviews")
      .where("status", "==", "PUBLISHED")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const r = d.data() as ProductReviewDoc;
      return {
        id: d.id,
        author: r.authorName,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verifiedBuyer: r.verifiedBuyer,
        createdAt: r.createdAt.toDate().toISOString(),
      };
    });
  },
  ["public-product-reviews"],
  { revalidate: 300, tags: ["products", "reviews"] },
);

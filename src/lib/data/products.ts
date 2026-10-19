import "server-only";
import {
  getActiveProducts,
  getActiveProductSlugs,
  getAllProductsInCategory,
  getProductDetailBySlug,
  getProductForCartPublic,
  getProductsByCategorySlug,
  getProductsByFlag,
  getProductsForSitemap,
  getPublishedReviews,
  getRelatedProductsPublic,
} from "@/server/catalog/public";
import type { Product } from "@/lib/types";

/**
 * Storefront product reads. These resolve against Firestore — the same
 * database the admin console writes to — so a product published in
 * `/admin/catalog` appears here immediately (subject to the ISR window).
 *
 * Function names + return shapes are unchanged; every consumer (home, shop,
 * PDP, search, sitemap, cart) keeps working as-is.
 */

export const getPopularProducts = (): Promise<Product[]> => getProductsByFlag("popular");
export const getLatestProducts = (): Promise<Product[]> => getProductsByFlag("latest");
export const getFeaturedProducts = (): Promise<Product[]> => getProductsByFlag("featured");

/** Home "Dairy & Eggs" rail — falls back to newest active products if that
 *  category has nothing live yet. */
export const getBreakfastProducts = async (): Promise<Product[]> => {
  const byCat = await getProductsByCategorySlug("dairy-eggs");
  return byCat.length ? byCat : getProductsByFlag("latest");
};

export const getAllProducts = (): Promise<Product[]> => getActiveProducts();

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  return getProductDetailBySlug(slug);
};

/** Rich detail (all SEO fields + gallery) for the PDP. */
export { getProductDetailBySlug };
export type { PublicProductDetail } from "@/server/catalog/public";

export const getRelatedProducts = (categoryId: string, excludeId: string): Promise<Product[]> =>
  getRelatedProductsPublic(categoryId, excludeId);

export const getAllProductSlugs = (): Promise<{ slug: string }[]> => getActiveProductSlugs();

export const getProductsForCategoryPage = (slug: string): Promise<Product[]> =>
  getAllProductsInCategory(slug);

export { getProductsForSitemap, getPublishedReviews };
export type { PublicReview } from "@/server/catalog/public";

export const getProductForCart = (productId: string): Promise<Product | null> =>
  getProductForCartPublic(productId);

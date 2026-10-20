import "server-only";
import {
  getMockProductById,
  getMockProductBySlug,
  getMockProducts,
  getMockProductsByCategory,
  getMockProductsByFlag,
  getMockRelatedProducts,
} from "@/lib/data/mock-catalog";
import type { Product } from "@/lib/types";
import type { PublicProductDetail } from "@/server/catalog/public";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import {
  getActiveProducts,
  getActiveProductSlugs,
  getAllProductsInCategory,
  getProductDetailBySlug as getDbProductDetailBySlug,
  getProductForCartPublic,
  getProductsByCategorySlug,
  getProductsByFlag,
  getProductsForSitemap as getDbProductsForSitemap,
  getPublishedReviews as getDbPublishedReviews,
  getRelatedProductsPublic,
} from "@/server/catalog/public";
*/

export const getPopularProducts = async (): Promise<Product[]> => getMockProductsByFlag("popular");
export const getLatestProducts = async (): Promise<Product[]> => getMockProductsByFlag("latest");
export const getFeaturedProducts = async (): Promise<Product[]> => getMockProductsByFlag("featured");

/** Home "Dairy & Eggs" rail */
export const getBreakfastProducts = async (): Promise<Product[]> => {
  const byCat = getMockProductsByCategory("dairy-eggs");
  return byCat.length ? byCat : getMockProductsByFlag("latest");
};

export const getAllProducts = async (): Promise<Product[]> => getMockProducts();

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  return getMockProductBySlug(slug);
};

/** Rich detail (all SEO fields + gallery) for the PDP. */
export const getProductDetailBySlug = async (slug: string): Promise<PublicProductDetail | null> => {
  return getMockProductBySlug(slug);
};

export type { PublicProductDetail } from "@/server/catalog/public";

export const getRelatedProducts = async (categoryId: string, excludeId: string): Promise<Product[]> =>
  getMockRelatedProducts(categoryId, excludeId);

export const getAllProductSlugs = async (): Promise<{ slug: string }[]> => {
  return getMockProducts().map((p) => ({ slug: p.slug }));
};

export const getProductsForCategoryPage = async (slug: string): Promise<Product[]> => {
  return getMockProductsByCategory(slug);
};

export interface PublicReview {
  id: string;
  rating: number;
  author: string;
  title: string | null;
  body: string | null;
  createdAt: string;
}

export const getPublishedReviews = async (productId: string): Promise<PublicReview[]> => {
  return [
    {
      id: "rev-1",
      rating: 5,
      author: "Pooja Sharma",
      title: "Authentic quality & aroma",
      body: "Loved the quality and packaging. Genuine herbal product, delivered very quickly.",
      createdAt: new Date(Date.now() - 5 * 86400e3).toISOString(),
    },
    {
      id: "rev-2",
      rating: 5,
      author: "Vikram Mehta",
      title: "Highly recommended",
      body: "Clean ingredients and honest pricing. Will definitely repurchase again.",
      createdAt: new Date(Date.now() - 12 * 86400e3).toISOString(),
    },
  ];
};

export const getProductsForSitemap = async (): Promise<{ slug: string; updatedAt: Date; image: string | null }[]> => {
  return getMockProducts().map((p) => ({
    slug: p.slug,
    updatedAt: new Date(),
    image: p.image_url,
  }));
};

export const getProductForCart = async (productId: string): Promise<Product | null> => {
  return getMockProductById(productId);
};

import "server-only";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  getMockCategories,
  getMockCategory,
  getMockProductById,
  getMockProductBySlug,
  getMockProducts,
  getMockProductsByCategory,
  getMockProductsByFlag,
  getMockRelatedProducts,
} from "@/lib/data/mock-catalog";
import type { Category, Product } from "@/lib/types";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db } from "@/server/firestore";
import type { CategoryDoc, ProductDoc, ProductImageDoc, ProductReviewDoc } from "@/server/models";
import { discountPct } from "@/lib/catalog/seo";
import { CATEGORY_STOCK_IMAGES } from "@/lib/catalog/category-images";
*/

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

export interface PublicReview {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedBuyer: boolean;
  createdAt: string;
}

export const getActiveProducts = async (): Promise<Product[]> => {
  return getMockProducts();
};

export const getProductsByFlag = async (
  flag: "popular" | "latest" | "featured",
  limit = 6,
): Promise<Product[]> => {
  return getMockProductsByFlag(flag).slice(0, limit);
};

export const getProductsByCategorySlug = async (slug: string, limit = 6): Promise<Product[]> => {
  return getMockProductsByCategory(slug).slice(0, limit);
};

export const getRelatedProductsPublic = async (
  categoryId: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> => {
  return getMockRelatedProducts(categoryId, excludeId, limit);
};

export const getActiveProductSlugs = async (): Promise<{ slug: string }[]> => {
  return getMockProducts().map((p) => ({ slug: p.slug }));
};

export const getProductsForSitemap = async (): Promise<
  { slug: string; updatedAt: Date; image: string | null }[]
> => {
  return getMockProducts().map((p) => ({
    slug: p.slug,
    updatedAt: new Date(),
    image: p.image_url,
  }));
};

export async function searchProductsPublic(query: string, limit = 24): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getMockProducts()
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export async function getProductForCartPublic(id: string): Promise<Product | null> {
  return getMockProductById(id);
}

export const getProductDetailBySlug = async (slug: string): Promise<PublicProductDetail | null> => {
  return getMockProductBySlug(slug);
};

export const getStorefrontCategories = async (): Promise<Category[]> => {
  return getMockCategories();
};

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  return getMockCategory(slug);
};

export const getAllProductsInCategory = async (slug: string): Promise<Product[]> => {
  return getMockProductsByCategory(slug);
};

export const getPublishedReviews = async (productId: string, limit = 20): Promise<PublicReview[]> => {
  return [
    {
      id: "rev-1",
      author: "Pooja Sharma",
      rating: 5,
      title: "Authentic quality & aroma",
      body: "Loved the quality and packaging. Genuine herbal product, delivered very quickly.",
      verifiedBuyer: true,
      createdAt: new Date(Date.now() - 5 * 86400e3).toISOString(),
    },
    {
      id: "rev-2",
      author: "Vikram Mehta",
      rating: 5,
      title: "Highly recommended",
      body: "Clean ingredients and honest pricing. Will definitely repurchase again.",
      verifiedBuyer: true,
      createdAt: new Date(Date.now() - 12 * 86400e3).toISOString(),
    },
  ];
};

import "server-only";
import { getMockCategories, getMockCategory } from "@/lib/data/mock-catalog";
import type { Category } from "@/lib/types";

// DATABASE COMMENTED OUT — USING MOCK DATA
// import { getCategoryBySlug, getStorefrontCategories } from "@/server/catalog/public";

/** Storefront category list — using mock data. */
export const getCategories = async (): Promise<Category[]> => {
  return getMockCategories();
};

/** Single category by slug (for `/category/[slug]`). */
export const getCategory = async (slug: string): Promise<Category | null> => {
  return getMockCategory(slug);
};

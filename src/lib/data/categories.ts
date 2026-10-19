import "server-only";
import { getCategoryBySlug, getStorefrontCategories } from "@/server/catalog/public";
import type { Category } from "@/lib/types";

/** Storefront category list — sourced from Firestore. */
export const getCategories = (): Promise<Category[]> => getStorefrontCategories();

/** Single category by slug (for `/category/[slug]`). */
export const getCategory = (slug: string): Promise<Category | null> => getCategoryBySlug(slug);

"use server";

import { z } from "zod";
import { getStorefrontCategories, searchProductsPublic } from "@/server/catalog/public";
import type { Category, Product } from "@/lib/types";

const querySchema = z.string().trim().min(1).max(100);

export interface SearchSuggestions {
  products: Product[];
  categories: Category[];
}

/**
 * Powers the live-suggestions dropdown as the user types. Runs on the server
 * against Cloud SQL so the client never downloads the full catalog to filter
 * it locally.
 */
export async function getSearchSuggestions(rawQuery: string): Promise<SearchSuggestions> {
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) return { products: [], categories: [] };
  const query = parsed.data.toLowerCase();

  const [products, allCategories] = await Promise.all([
    searchProductsPublic(query, 5),
    getStorefrontCategories(),
  ]);

  return {
    products,
    categories: allCategories.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 3),
  };
}

/** Full result set for the "showing results" view. */
export async function getSearchResults(rawQuery: string): Promise<Product[]> {
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) return [];
  return searchProductsPublic(parsed.data, 24);
}

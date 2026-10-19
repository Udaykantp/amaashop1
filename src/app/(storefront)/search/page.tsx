import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/search-experience";
import { getCategories } from "@/lib/data/categories";

export const metadata: Metadata = {
  title: "Search",
  // An interactive, client-driven search UI with no distinct per-query URL
  // isn't something worth indexing on its own.
  robots: { index: false, follow: true },
};

// Reads categories from Cloud SQL — not available during the build.
export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const categories = await getCategories();
  return <SearchExperience categories={categories} />;
}

"use client";

import { useRouter } from "next/navigation";
import { SORT_LABELS, type SortOption } from "@/lib/shop/filter-products";

/** Sort control scoped to a clean `/category/[slug]` URL (keeps the path). */
export function CategorySort({
  basePath,
  currentSort,
}: {
  basePath: string;
  currentSort: SortOption;
}) {
  const router = useRouter();
  return (
    <select
      value={currentSort}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v === "featured" ? basePath : `${basePath}?sort=${v}`);
      }}
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label="Sort products"
    >
      {Object.entries(SORT_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

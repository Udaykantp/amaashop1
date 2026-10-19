"use client";

import { useRouter } from "next/navigation";
import { SORT_LABELS, type SortOption } from "@/lib/shop/filter-products";
import { buildShopUrl } from "@/lib/shop/build-shop-url";

export function SortSelect({
  currentSort,
  currentParams,
}: {
  currentSort: SortOption;
  currentParams: Record<string, string | undefined>;
}) {
  const router = useRouter();

  return (
    <select
      value={currentSort}
      onChange={(e) => router.push(buildShopUrl(currentParams, { sort: e.target.value }))}
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

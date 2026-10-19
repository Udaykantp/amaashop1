import Link from "next/link";
import { buildShopUrl } from "@/lib/shop/build-shop-url";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

/**
 * Pure `<Link>` navigation — no client JS needed at all. Selecting a
 * category is just a URL change, so Next re-renders the Server Component
 * page with the new `searchParams`.
 */
export function CategoryFilterList({
  categories,
  activeCategory,
  currentParams,
  variant = "sidebar",
}: {
  categories: Category[];
  activeCategory: string;
  currentParams: Record<string, string | undefined>;
  variant?: "sidebar" | "chips";
}) {
  if (variant === "chips") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildShopUrl(currentParams, { category: null })}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            !activeCategory ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-600",
          )}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={buildShopUrl(currentParams, { category: cat.name })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              activeCategory === cat.name ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-600",
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      <li>
        <Link
          href={buildShopUrl(currentParams, { category: null })}
          className={cn(
            "block w-full rounded-md px-3 py-2 text-left text-sm",
            !activeCategory ? "bg-emerald-50 font-semibold text-emerald-600" : "text-neutral-600 hover:bg-neutral-50",
          )}
        >
          All Categories
        </Link>
      </li>
      {categories.map((cat) => (
        <li key={cat.id}>
          <Link
            href={buildShopUrl(currentParams, { category: cat.name })}
            className={cn(
              "block w-full rounded-md px-3 py-2 text-left text-sm",
              activeCategory === cat.name
                ? "bg-emerald-50 font-semibold text-emerald-600"
                : "text-neutral-600 hover:bg-neutral-50",
            )}
          >
            {cat.icon} {cat.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

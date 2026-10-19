"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const SORTS = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "created_desc", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_desc", label: "Price high–low" },
  { value: "price_asc", label: "Price low–high" },
] as const;

export function CatalogFilters({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  const status = params.get("status") ?? "ALL";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "updated_desc";

  function apply(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "" || (k === "status" && v === "ALL")) sp.delete(k);
      else sp.set(k, v);
    }
    if (!("page" in next)) sp.delete("page"); // any filter change resets paging
    start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  }

  // debounce the search box
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => apply({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, brand, tag…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <select
          aria-label="Category"
          value={category}
          onChange={(e) => apply({ category: e.target.value || null })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={cn(
          "flex gap-1 rounded-lg border bg-card p-1 text-sm transition-opacity",
          pending && "opacity-60",
        )}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => apply({ status: t.value })}
            aria-current={status === t.value ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              status === t.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

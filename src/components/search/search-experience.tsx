"use client";

import { ArrowLeft, Clock, Search, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { getSearchResults, getSearchSuggestions, type SearchSuggestions } from "@/actions/search";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridSkeleton } from "@/components/skeletons/product-skeletons";
import { formatPrice } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

const RECENT_KEY = "amaashop-recent-searches";
const POPULAR_SEARCHES = ["Fresh Fruits", "Organic Vegetables", "Dairy Milk", "Bread", "Beverages"];
const DEBOUNCE_MS = 250;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SearchExperience({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({ products: [], categories: [] });
  const [results, setResults] = useState<Product[] | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRecentSearches(loadRecent());
  }, []);

  useEffect(() => {
    if (!query.trim() || results !== null) {
      setSuggestions({ products: [], categories: [] });
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        setSuggestions(await getSearchSuggestions(query));
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, results]);

  const runSearch = (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    startTransition(async () => {
      setResults(await getSearchResults(q));
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.setItem(RECENT_KEY, JSON.stringify([]));
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
  };

  if (results !== null) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-8">
        <div className="flex items-center gap-3">
          <button onClick={clearSearch} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-neutral-100" aria-label="Back to search">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-neutral-800 lg:text-2xl">Results for &quot;{query}&quot;</h1>
          <span className="text-xs text-neutral-500 lg:text-sm">({results.length})</span>
        </div>

        {isPending ? (
          <div className="mt-4">
            <ProductGridSkeleton count={6} />
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold text-neutral-700">No products found</p>
            <p className="mt-1 text-sm text-neutral-500">Try a different search term</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 lg:px-8 lg:py-8">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
        <Search size={20} className="shrink-0 text-neutral-400" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
          placeholder="Search products, brands, categories..."
          className="h-12 flex-1 border-0 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="flex h-8 w-8 items-center justify-center rounded-full active:bg-neutral-200" aria-label="Clear search input">
            <X size={18} className="text-neutral-400" />
          </button>
        )}
      </div>

      {query.trim() && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-100 bg-white">
          {suggestions.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-neutral-50"
            >
              <Search size={16} className="text-neutral-400" />
              <span className="flex-1 text-sm text-neutral-700">{cat.name}</span>
              <span className="text-xs text-neutral-400">Category</span>
            </Link>
          ))}
          {suggestions.products.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} className="flex w-full items-center gap-3 p-3 text-left hover:bg-neutral-50">
              <Image src={p.image_url} alt={p.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-700">{p.name}</p>
                <p className="text-xs font-medium text-red-600">{formatPrice(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {recentSearches.length > 0 && !query && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <Clock size={16} /> Recent Searches
            </h2>
            <button onClick={clearRecent} className="text-xs text-neutral-400 hover:text-neutral-600">Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <button key={s} onClick={() => runSearch(s)} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!query && (
        <div className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <TrendingUp size={16} /> Popular Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button key={s} onClick={() => runSearch(s)} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!query && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Browse Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white p-3 hover:bg-neutral-50"
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm font-medium text-neutral-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

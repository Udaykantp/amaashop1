"use client";

import { CornerDownLeft, Clock, LayoutGrid, Loader2, Search, TrendingUp, X } from "lucide-react";
import { Roboto } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { getSearchSuggestions, type SearchSuggestions } from "@/actions/search";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Header search — a command-palette style field with a live, keyboard-driven
 * suggestion panel.
 *
 * Still deliberately does NOT read the current `?q=` via `useSearchParams()`:
 * that hook requires a Suspense boundary for static rendering, and since this
 * lives in the shared layout above every route, that boundary would also sit
 * above dynamic pages like the PDP — where it causes Next.js to flush a 200
 * response before a page's `notFound()` can run. Starting empty avoids it.
 *
 * UX notes:
 *  - `⌘K` / `Ctrl+K` focuses the field from anywhere (desktop).
 *  - As you type (2+ chars) it debounces a server action for product +
 *    category matches; the top match is previewed as inline "ghost" text you
 *    accept with Tab / →.
 *  - ↑/↓ move a highlight through categories → products → "search all";
 *    ↵ opens the highlighted row (or runs a full search), Esc closes.
 *  - Empty + focused shows recent searches (localStorage) and trending terms.
 */

/** Roboto is used only inside the search field + its suggestion panel. */
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

const RECENT_KEY = "amaashop-recent-searches";
const TRENDING = ["Fresh Fruits", "Organic Vegetables", "Dairy Milk", "Bread", "Beverages"];
const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;
const EMPTY: SearchSuggestions = { products: [], categories: [] };

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

type NavItem =
  | { kind: "category"; term: string; href: string }
  | {
      kind: "product";
      term: string;
      href: string;
      image: string;
      price: number;
      oldPrice: number | null;
      unit: string | null;
    }
  | { kind: "all"; term: string; href: string };

/** Renders `text` with the matched slice of `query` emphasised. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold text-neutral-900">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

export function SearchBar({
  variant = "desktop",
  onSubmit,
}: {
  variant?: "desktop" | "mobile";
  onSubmit?: () => void;
}) {
  const router = useRouter();
  const isDesktop = variant === "desktop";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggest, setSuggest] = useState<SearchSuggestions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    setMounted(true);
    setRecent(loadRecent());
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  // ⌘K / Ctrl+K to focus the field from anywhere.
  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop]);

  // Dismiss on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced live suggestions, with a request-id guard against out-of-order responses.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setSuggest(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await getSearchSuggestions(q);
        if (id === reqId.current) setSuggest(res);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const persistRecent = useCallback((term: string) => {
    setRecent((prev) => {
      const next = [term, ...prev.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* private mode / quota — recent list is best-effort */
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }, []);

  const goTo = useCallback(
    (href: string, term?: string) => {
      if (term) persistRecent(term);
      router.push(href);
      close();
      onSubmit?.();
    },
    [router, persistRecent, close, onSubmit],
  );

  const runSearch = useCallback(
    (raw: string) => {
      const term = raw.trim();
      if (!term) return;
      goTo(`/shop?q=${encodeURIComponent(term)}`, term);
    },
    [goTo],
  );

  const clearRecent = useCallback(() => {
    setRecent([]);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([]));
    } catch {
      /* noop */
    }
  }, []);

  // Flat, ordered list the keyboard highlight walks through.
  const navItems = useMemo<NavItem[]>(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return [];
    const cats: NavItem[] = suggest.categories.map((c) => ({
      kind: "category",
      term: c.name,
      href: `/shop?category=${encodeURIComponent(c.name)}`,
    }));
    const prods: NavItem[] = suggest.products.map((p) => ({
      kind: "product",
      term: p.name,
      href: `/product/${p.slug}`,
      image: p.image_url,
      price: p.price,
      oldPrice: p.old_price,
      unit: p.unit,
    }));
    return [...cats, ...prods, { kind: "all", term: q, href: `/shop?q=${encodeURIComponent(q)}` }];
  }, [query, suggest]);

  // Reset the highlight whenever the candidate list changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [navItems]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (activeIndex < 0) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Inline "ghost" completion: the top name that starts with what's typed.
  const ghost = useMemo(() => {
    if (!query || query.length > 24) return "";
    const pool = [
      ...suggest.categories.map((c) => c.name),
      ...suggest.products.map((p) => p.name),
    ];
    const hit = pool.find(
      (n) => n.length > query.length && n.toLowerCase().startsWith(query.toLowerCase()),
    );
    return hit ? hit.slice(query.length) : "";
  }, [query, suggest]);

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, navItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter": {
        e.preventDefault();
        const item = activeIndex >= 0 ? navItems[activeIndex] : undefined;
        if (item) goTo(item.href, item.kind === "product" ? undefined : item.term);
        else runSearch(query);
        break;
      }
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
      case "ArrowRight": {
        const atEnd = e.currentTarget.selectionStart === e.currentTarget.value.length;
        if (ghost && (e.key === "Tab" || atEnd)) {
          e.preventDefault();
          setQuery((q) => q + ghost);
        }
        break;
      }
    }
  };

  const showPanel = open;
  const hasQuery = query.trim().length >= MIN_CHARS;
  const noMatches = hasQuery && !loading && navItems.length <= 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative",
        roboto.className,
        isDesktop ? "hidden w-full max-w-2xl lg:block" : "flex-1",
      )}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 transition-all duration-150",
          open
            ? "border-emerald-500 bg-white shadow-sm ring-4 ring-emerald-500/10"
            : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white",
        )}
      >
        <Search size={isDesktop ? 20 : 18} className="shrink-0 text-neutral-400" />

        <div className="relative flex-1">
          {open && ghost && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre",
                isDesktop ? "h-11 text-[15px]" : "h-10 text-sm",
              )}
            >
              <span className="invisible">{query}</span>
              <span className="text-neutral-400">{ghost}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
            placeholder={
              isDesktop ? "Search for products..." : "Search for products, brands..."
            }
            className={cn(
              "w-full border-0 bg-transparent text-neutral-800 placeholder:text-neutral-400 focus:outline-none",
              isDesktop ? "h-11 text-[15px]" : "h-10 text-sm",
            )}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            aria-label="Search for products"
          />
        </div>

        {loading && <Loader2 size={16} className="shrink-0 animate-spin text-neutral-400" />}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {mounted && isDesktop && !query && (
          <kbd className="pointer-events-none hidden shrink-0 items-center gap-0.5 rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-neutral-400 xl:flex">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        )}

        {isDesktop && (
          <button
            type="submit"
            className="m-1 shrink-0 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Search
          </button>
        )}
      </form>

      {showPanel && (
        <div
          ref={panelRef}
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10"
        >
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain py-2">
            {!hasQuery ? (
              <>
                {recent.length > 0 && (
                  <section className="px-2 pb-1">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                        Recent
                      </span>
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600"
                      >
                        Clear
                      </button>
                    </div>
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runSearch(term)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <Clock size={15} className="shrink-0 text-neutral-400" />
                        <span className="truncate">{term}</span>
                      </button>
                    ))}
                  </section>
                )}
                <section className="px-2 pt-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <TrendingUp size={13} className="text-emerald-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      Trending
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1">
                    {TRENDING.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runSearch(term)}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                {loading && navItems.length <= 1 && (
                  <div className="space-y-1 px-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-2 py-2">
                        <div className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-neutral-100" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
                          <div className="h-2.5 w-1/3 animate-pulse rounded bg-neutral-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {suggest.categories.length > 0 && (
                  <section className="px-2">
                    <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      Categories
                    </p>
                    {suggest.categories.map((c, i) => {
                      const idx = i;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          data-idx={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => goTo(`/shop?category=${encodeURIComponent(c.name)}`, c.name)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
                            activeIndex === idx ? "bg-neutral-100" : "hover:bg-neutral-50",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                            <LayoutGrid size={15} />
                          </span>
                          <span className="truncate text-sm text-neutral-700">
                            <Highlight text={c.name} query={query.trim()} />
                          </span>
                          {typeof c.productCount === "number" && (
                            <span className="ml-auto text-xs text-neutral-400">{c.productCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </section>
                )}

                {suggest.products.length > 0 && (
                  <section className="px-2">
                    <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      Products
                    </p>
                    {suggest.products.map((p, i) => {
                      const idx = suggest.categories.length + i;
                      const discount =
                        p.old_price && p.old_price > p.price
                          ? Math.round(((p.old_price - p.price) / p.old_price) * 100)
                          : 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          data-idx={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => goTo(`/product/${p.slug}`)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
                            activeIndex === idx ? "bg-neutral-100" : "hover:bg-neutral-50",
                          )}
                        >
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
                            {p.image_url ? (
                              <Image
                                src={p.image_url}
                                alt=""
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-neutral-300">
                                <Search size={14} />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-neutral-800">
                              <Highlight text={p.name} query={query.trim()} />
                            </span>
                            {p.unit && (
                              <span className="block truncate text-xs text-neutral-400">{p.unit}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold text-neutral-900">
                              {formatPrice(p.price)}
                            </span>
                            {discount > 0 && (
                              <span className="block text-[11px] text-neutral-400 line-through">
                                {formatPrice(p.old_price as number)}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                )}

                {noMatches && (
                  <p className="px-4 py-3 text-sm text-neutral-500">
                    No direct matches for &ldquo;{query.trim()}&rdquo; — try a full search below.
                  </p>
                )}

                <section className="mt-1 border-t border-neutral-100 px-2 pt-1">
                  {(() => {
                    const idx = navItems.length - 1;
                    return (
                      <button
                        type="button"
                        data-idx={idx}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => runSearch(query)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left",
                          activeIndex === idx ? "bg-neutral-100" : "hover:bg-neutral-50",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white">
                          <Search size={15} />
                        </span>
                        <span className="flex-1 truncate text-sm text-neutral-700">
                          Search for{" "}
                          <span className="font-semibold text-neutral-900">
                            &ldquo;{query.trim()}&rdquo;
                          </span>
                        </span>
                        <CornerDownLeft size={14} className="shrink-0 text-neutral-300" />
                      </button>
                    );
                  })()}
                </section>
              </>
            )}
          </div>

          {isDesktop && (
            <div className="flex items-center gap-4 border-t border-neutral-100 bg-neutral-50/60 px-4 py-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-white px-1">↑</kbd>
                <kbd className="rounded border border-neutral-200 bg-white px-1">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-white px-1">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-white px-1">esc</kbd>
                close
              </span>
              {ghost && (
                <span className="ml-auto flex items-center gap-1">
                  <kbd className="rounded border border-neutral-200 bg-white px-1">tab</kbd>
                  complete
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

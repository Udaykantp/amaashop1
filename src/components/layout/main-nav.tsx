"use client";

import {
  ArrowRight,
  Beef,
  Carrot,
  ChevronDown,
  Cookie,
  Croissant,
  CupSoda,
  LayoutGrid,
  Milk,
  ShoppingBasket,
  Snowflake,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_LINKS, NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Desktop primary navigation: the "All Categories" mega menu, the main section
 * links (with an active-route underline), and a few one-click category
 * shortcuts. Client-only because the mega menu needs open/close + hover-intent
 * state and `usePathname()` for the active indicator.
 *
 * The mega-menu panel is only rendered while open — never parked in the DOM at
 * `opacity-0` — so its markup doesn't show before hydration, isn't announced by
 * screen readers, and can't leak visually if a style fails to load.
 */

const CATEGORY_META: Record<string, { icon: LucideIcon; blurb: string }> = {
  "Fruits & Vegetables": { icon: Carrot, blurb: "Farm-fresh produce" },
  "Meats & Seafood": { icon: Beef, blurb: "Cuts & catch of the day" },
  "Breakfast & Dairy": { icon: Milk, blurb: "Milk, eggs & spreads" },
  "Breads & Bakery": { icon: Croissant, blurb: "Baked fresh daily" },
  Beverages: { icon: CupSoda, blurb: "Juices, sodas & water" },
  "Frozen Foods": { icon: Snowflake, blurb: "Ready when you are" },
  "Biscuits & Snacks": { icon: Cookie, blurb: "Munchies & treats" },
  "Grocery & Staples": { icon: Wheat, blurb: "Rice, flour, oil & dal" },
};

const catHref = (name: string) => `/shop?category=${encodeURIComponent(name)}`;

/**
 * Routes where the category nav is noise rather than navigation — the account
 * "panel", auth surfaces and checkout. The bar is suppressed on these.
 */
const HIDDEN_ON = ["/account", "/signin", "/signup", "/checkout"];

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openNow = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small grace period so a diagonal cursor path from the trigger to the panel
  // doesn't dismiss it.
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: Esc closes (focus back to trigger), and a pointer/focus outside
  // the menu closes it — needed because the trigger is also click-openable.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onOutside = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  // Drop any pending close timer on unmount.
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <nav className="border-b border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center px-8">
        {/* All Categories + mega menu */}
        <div ref={rootRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-white transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70",
              open ? "bg-emerald-600" : "bg-emerald-500 hover:bg-emerald-600",
            )}
          >
            <LayoutGrid size={17} />
            All Categories
            <ChevronDown
              size={15}
              className={cn("transition-transform duration-200", open && "rotate-180")}
            />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 w-[660px] origin-top rounded-b-xl border border-neutral-100 bg-white p-3 shadow-xl shadow-neutral-900/10 animate-page-enter">
              <ul className="grid grid-cols-2 gap-1">
                {CATEGORY_LINKS.map((name) => {
                  const meta = CATEGORY_META[name];
                  const Icon = meta?.icon ?? ShoppingBasket;
                  return (
                    <li key={name}>
                      <Link
                        href={catHref(name)}
                        className="group/item flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-emerald-50/70"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover/item:bg-emerald-100">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-800">
                            {name}
                          </span>
                          {meta && (
                            <span className="block truncate text-xs text-neutral-400">
                              {meta.blurb}
                            </span>
                          )}
                        </span>
                        <ArrowRight
                          size={15}
                          className="shrink-0 -translate-x-1 text-emerald-500 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/shop"
                className="mt-1 flex items-center justify-center gap-1.5 border-t border-neutral-100 py-2.5 text-sm font-semibold text-emerald-600 transition-colors hover:bg-neutral-50"
              >
                Browse the full catalogue
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>

        {/* Primary section links */}
        <ul className="flex items-center pl-3">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative block px-3.5 py-3.5 text-sm font-medium transition-colors",
                    active ? "text-emerald-600" : "text-neutral-700 hover:text-emerald-600",
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute inset-x-3.5 bottom-0 h-0.5 origin-left rounded-full bg-emerald-500 transition-transform duration-200",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* One-click category shortcuts */}
        <ul className="ml-auto hidden items-center xl:flex">
          {CATEGORY_LINKS.slice(0, 5).map((name, i) => (
            <li key={name} className="flex items-center">
              {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-neutral-300" />}
              <Link
                href={catHref(name)}
                className="rounded-md px-2 py-1.5 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-emerald-600"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

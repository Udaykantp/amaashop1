"use client";

import { Home, Search, LayoutGrid, Heart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/store/cart-provider";
import { useWishlist } from "@/store/wishlist-provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: LayoutGrid, label: "Categories", href: "/shop" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: User, label: "Account", href: "/account" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count: wishlistCount } = useWishlist();
  // Product pages render their own sticky Add to Cart / Buy Now bar in the
  // same fixed-bottom slot — showing both would stack two bottom bars.
  const { totalItems } = useCart();

  if (pathname.startsWith("/product/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 backdrop-blur-lg pb-safe lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badge = item.href === "/wishlist" ? wishlistCount : item.href === "/" ? totalItems : 0;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 transition-colors",
                  isActive ? "text-emerald-600" : "text-neutral-400",
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative">
                  <item.icon size={22} className={isActive ? "fill-emerald-50" : ""} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

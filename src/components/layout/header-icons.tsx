"use client";

import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart-provider";
import { useWishlist } from "@/store/wishlist-provider";
import { cn } from "@/lib/utils";

function IconBadge({ count, compact }: { count: number; compact: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute flex items-center justify-center rounded-full bg-red-500 font-bold text-white",
        compact ? "top-1 right-1 h-4 min-w-4 px-1 text-[10px]" : "-top-2 -right-2 h-5 min-w-5 px-1 text-xs font-semibold",
      )}
    >
      {count}
    </span>
  );
}

export function HeaderIcons({ compact = false }: { compact?: boolean }) {
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [cartAnimating, setCartAnimating] = useState(false);

  useEffect(() => {
    if (totalItems === 0) return;
    setCartAnimating(true);
    const t = setTimeout(() => setCartAnimating(false), 400);
    return () => clearTimeout(t);
  }, [totalItems]);

  const size = compact ? 22 : 24;

  return (
    <>
      <Link
        href="/wishlist"
        className={cn(
          "relative flex items-center justify-center text-neutral-700 transition-colors hover:text-emerald-600",
          compact
            ? "h-10 w-10 shrink-0 rounded-full active:bg-neutral-100"
            : "h-10 w-10 shrink-0 rounded-full hover:bg-neutral-100",
        )}
        aria-label="Wishlist"
      >
        <Heart size={size} />
        <IconBadge count={wishlistCount} compact={compact} />
      </Link>
      <Link
        href="/cart"
        className={cn(
          "relative flex items-center justify-center text-neutral-700 transition-colors hover:text-emerald-600",
          compact
            ? "h-10 w-10 shrink-0 rounded-full active:bg-neutral-100"
            : "h-10 w-10 shrink-0 rounded-full hover:bg-neutral-100",
          cartAnimating && "animate-cart-bounce",
        )}
        aria-label={`Shopping cart with ${totalItems} items`}
      >
        <ShoppingCart size={size} />
        <IconBadge count={totalItems} compact={compact} />
      </Link>
    </>
  );
}

"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/store/wishlist-provider";
import { useToast } from "@/store/toast-provider";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function WishlistToggleButton({
  product,
  variant = "inline",
}: {
  product: Product;
  variant?: "inline" | "overlay" | "card";
}) {
  const { has, toggle } = useWishlist();
  const { show } = useToast();
  const isWishlisted = has(product.id);

  const handleClick = (e: React.MouseEvent) => {
    // The card wraps the image in a <Link>; never let the click navigate.
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
    show(isWishlisted ? "Removed from wishlist" : "Added to wishlist", isWishlisted ? "info" : "success");
  };

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-all active:scale-90",
          "hover:bg-white",
          // Always visible on touch; fades in on hover/focus on desktop —
          // unless it's already wishlisted, then it stays put.
          isWishlisted
            ? "opacity-100"
            : "lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100",
        )}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isWishlisted}
      >
        <Heart
          size={16}
          className={isWishlisted ? "fill-red-500 text-red-500" : "text-neutral-600"}
        />
      </button>
    );
  }

  if (variant === "overlay") {
    return (
      <button
        onClick={handleClick}
        className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm active:scale-90 lg:hidden"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isWishlisted}
      >
        <Heart size={20} className={isWishlisted ? "fill-red-500 text-red-500" : "text-neutral-500"} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600",
        "hover:border-red-300 hover:text-red-500",
      )}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isWishlisted}
    >
      <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
    </button>
  );
}

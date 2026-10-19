"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useWishlist } from "@/store/wishlist-provider";
import { WishlistItemCard } from "@/components/wishlist/wishlist-item-card";

export function WishlistView() {
  const { items } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Heart size={40} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Your wishlist is empty</h1>
        <p className="mt-2 text-neutral-500">Save your favorite products here for easy access later.</p>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
          <ShoppingBag size={18} />
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-8">
      <h1 className="text-lg font-bold text-neutral-800 lg:text-2xl">My Wishlist</h1>
      <p className="mt-0.5 text-xs text-neutral-500 lg:mt-1 lg:text-sm">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <WishlistItemCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart-provider";
import { useWishlist } from "@/store/wishlist-provider";
import { useToast } from "@/store/toast-provider";
import { calculateDiscount, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function WishlistItemCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { remove } = useWishlist();
  const { show } = useToast();
  const discount = calculateDiscount(product.price, product.old_price);

  const handleAddToCart = async () => {
    const result = await addToCart(product);
    show(result.error ?? `${product.name} added to cart`, result.error ? "error" : "success");
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-neutral-50">
        <Image src={product.image_url} alt={product.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">-{discount}%</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-2.5 lg:p-3">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-neutral-800 lg:text-sm">{product.name}</h3>
        </Link>
        <div className="mt-1 flex items-center gap-1 lg:mt-2">
          <span className="text-sm font-bold text-red-600">{formatPrice(product.price)}</span>
          {product.old_price && <span className="text-xs text-neutral-400 line-through">{formatPrice(product.old_price)}</span>}
        </div>
        <p className={cn("mt-1 text-[10px] font-medium", product.stock > 0 ? "text-emerald-600" : "text-red-500")}>
          {product.stock > 0 ? "In Stock" : "Out of Stock"}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <ShoppingCart size={14} />
            Add
          </button>
          <button
            onClick={() => {
              remove(product.id);
              show("Removed from wishlist", "info");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-500"
            aria-label="Remove from wishlist"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

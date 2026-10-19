"use client";

import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart-provider";
import { useWishlist } from "@/store/wishlist-provider";
import { useToast } from "@/store/toast-provider";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart } = useCart();
  const { has, toggle } = useWishlist();
  const { show } = useToast();

  const moveToWishlist = () => {
    if (!has(item.product.id)) {
      toggle(item.product);
      show("Moved to wishlist", "success");
    }
    removeFromCart(item.product.id);
  };

  return (
    <div className="flex gap-3 rounded-xl border border-neutral-100 bg-white p-3 lg:gap-4 lg:p-4">
      <Link href={`/product/${item.product.slug}`} className="relative h-20 w-20 shrink-0 lg:h-24 lg:w-24">
        <Image
          src={item.product.image_url}
          alt={item.product.name}
          fill
          sizes="96px"
          className="rounded-lg border border-neutral-100 object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/product/${item.product.slug}`} className="truncate text-sm font-semibold text-neutral-800 hover:text-emerald-600">
          {item.product.name}
        </Link>
        {item.product.unit && <p className="mt-0.5 text-xs text-neutral-400">{item.product.unit}</p>}
        <p className="mt-1 text-sm font-bold text-red-600">{formatPrice(item.product.price)}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center rounded-lg border border-neutral-200">
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center text-neutral-600 active:bg-neutral-50 lg:h-9 lg:w-9"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center text-neutral-600 active:bg-neutral-50 lg:h-9 lg:w-9"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={moveToWishlist} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 lg:text-sm" aria-label="Move to wishlist">
              <Heart size={16} className={has(item.product.id) ? "fill-red-500 text-red-500" : ""} />
              <span className="hidden lg:inline">Wishlist</span>
            </button>
            <button onClick={() => removeFromCart(item.product.id)} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 lg:text-sm" aria-label="Remove item">
              <Trash2 size={16} />
              <span className="hidden lg:inline">Remove</span>
            </button>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-neutral-800">{formatPrice(item.product.price * item.quantity)}</p>
      </div>
    </div>
  );
}

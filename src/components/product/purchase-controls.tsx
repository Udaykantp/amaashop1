"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/store/cart-provider";
import { useToast } from "@/store/toast-provider";
import { WishlistToggleButton } from "@/components/product/wishlist-toggle-button";
import type { Product } from "@/lib/types";

/**
 * One client component drives both the desktop inline controls and the
 * mobile sticky purchase bar — they share the same `quantity` state and
 * handlers, so splitting them would mean lifting state across siblings for
 * no benefit. Responsive Tailwind classes (hidden lg:flex / lg:hidden)
 * pick which half renders per breakpoint, same as the source app.
 */
export function PurchaseControls({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { show } = useToast();
  const router = useRouter();

  const outOfStock = product.stock === 0;

  const handleAddToCart = () => {
    const result = addToCart(product, quantity);
    if (result.error) {
      show(result.error, "error");
      return;
    }
    show(`${product.name} added to cart`, "success");
  };

  const handleBuyNow = () => {
    const result = addToCart(product, quantity);
    if (result.error) {
      show(result.error, "error");
      return;
    }
    router.push("/checkout");
  };

  return (
    <>
      {/* Desktop */}
      <div className="mt-6 hidden flex-wrap items-center gap-3 lg:flex">
        <div className="flex items-center rounded-lg border border-neutral-200">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-neutral-600 hover:bg-neutral-50"
            aria-label="Decrease quantity"
          >
            <Minus size={18} />
          </button>
          <span className="w-12 text-center text-base font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-11 w-11 items-center justify-center text-neutral-600 hover:bg-neutral-50"
            aria-label="Increase quantity"
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="flex h-11 items-center gap-2 rounded-lg border border-emerald-500 px-6 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white disabled:opacity-50"
        >
          <ShoppingCart size={18} />
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex h-11 items-center rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          Buy Now
        </button>
        <WishlistToggleButton product={product} />
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 shadow-[0_-2px_16px_rgba(15,23,42,0.06)] backdrop-blur-lg pb-safe lg:hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex items-center rounded-lg border border-neutral-200">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center text-neutral-600 active:bg-neutral-50"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center text-neutral-600 active:bg-neutral-50"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-500 text-sm font-semibold text-emerald-600 active:bg-emerald-50 disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            Add
          </button>
          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="flex h-11 flex-[1.5] items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-white active:bg-emerald-600 disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </>
  );
}

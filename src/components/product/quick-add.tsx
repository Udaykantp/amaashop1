"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/store/cart-provider";
import { useToast } from "@/store/toast-provider";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

/**
 * Tiny client island for the product card. Keeps the card itself a Server
 * Component — only this button ships JS. Adding is a synchronous local-cart
 * update, so there's no spinner and no page refresh; the button just flips to
 * a brief "Added" confirmation.
 */
export function QuickAdd({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { show } = useToast();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const outOfStock = product.stock === 0;

  useEffect(() => () => clearTimeout(timer.current), []);

  function onAdd(e: React.MouseEvent) {
    // The card is usually wrapped in a <Link> — don't navigate or bubble.
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;

    const res = addToCart(product, 1);
    if (res.error) {
      show(res.error, "error");
      return;
    }

    setAdded(true);
    show(`${product.name} added to cart`, "success");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={outOfStock}
      aria-label={outOfStock ? "Out of stock" : `Add ${product.name} to cart`}
      className={cn(
        "mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-colors",
        "disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent",
        added
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white",
      )}
    >
      {outOfStock ? (
        "Out of stock"
      ) : added ? (
        <>
          <Check size={15} /> Added
        </>
      ) : (
        <>
          <Plus size={15} /> Add
        </>
      )}
    </button>
  );
}

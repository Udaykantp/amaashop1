"use client";

import { ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/store/cart-provider";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { CartSummary } from "@/components/cart/cart-summary";

export function CartView() {
  const { items, subtotal, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <ShoppingBag size={40} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-neutral-800">Your cart is empty</h1>
        <p className="mt-2 text-neutral-500">
          Looks like you haven&apos;t added any products yet. Start shopping to fill your cart with fresh groceries!
        </p>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
          <ArrowLeft size={18} />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 lg:px-8 lg:py-8">
      <div className="px-3 lg:px-0">
        <h1 className="text-lg font-bold text-neutral-800 lg:text-2xl">Shopping Cart</h1>
        <p className="mt-0.5 text-xs text-neutral-500 lg:mt-1 lg:text-sm">
          {items.length} {items.length === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-3 lg:grid-cols-3 lg:gap-6 lg:px-0">
        <div className="lg:col-span-2">
          <div className="mt-3 space-y-3 lg:mt-0">
            {items.map((item) => (
              <CartItemRow key={item.product.id} item={item} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
              <ArrowLeft size={16} />
              Continue Shopping
            </Link>
            <button onClick={clearCart} className="text-sm text-neutral-400 hover:text-red-500">
              Clear Cart
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <CartSummary subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}

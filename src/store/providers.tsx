"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/store/cart-provider";
import { WishlistProvider } from "@/store/wishlist-provider";
import { ToastProvider } from "@/store/toast-provider";
import { CurrencyProvider } from "@/store/currency-provider";

/** Single composed client boundary for all interactive, cross-page state. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <CartProvider>
        <WishlistProvider>
          <ToastProvider>{children}</ToastProvider>
        </WishlistProvider>
      </CartProvider>
    </CurrencyProvider>
  );
}

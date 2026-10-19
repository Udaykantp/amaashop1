"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { CartItem, Product } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  /** Optimistic, synchronous add. Price/stock are re-verified server-side at checkout. */
  addToCart: (product: Product, quantity?: number) => { error?: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "amaashop-cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Guest cart. Lives entirely on the client (localStorage) — there is no `carts`
 * table — so every mutation here is a plain, instant state update: no server
 * round-trip, no Server Action, and therefore no route refresh of the page the
 * shopper is on. The authoritative price/stock check happens once, at checkout,
 * in `placeOrderAction`, which recomputes the order total from the DB and never
 * trusts these values.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Mirror of `items` so `addToCart` can read the live quantity synchronously
  // without depending on a fresh render.
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // Keep the cart in sync across tabs/windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(loadCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addToCart: CartContextValue["addToCart"] = (product, quantity = 1) => {
    if (product.stock <= 0) return { error: "This item is out of stock." };

    const inCart = itemsRef.current.find((item) => item.product.id === product.id)?.quantity ?? 0;
    if (inCart >= product.stock) {
      return { error: `You already have all ${product.stock} available in your cart.` };
    }

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, product.stock);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, product, quantity: nextQuantity } // refresh product snapshot too
            : item,
        );
      }
      return [...prev, { product, quantity: nextQuantity }];
    });

    return {};
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock || quantity) }
          : item,
      ),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

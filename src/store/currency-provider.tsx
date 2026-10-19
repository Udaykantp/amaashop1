"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

type Currency = "INR" | "USD";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceInInr: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);
const EXCHANGE_RATE_USD_TO_INR = 83.5;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("INR");

  const formatPrice = useMemo(
    () => (priceInInr: number) => {
      const converted = currency === "USD" ? priceInInr / EXCHANGE_RATE_USD_TO_INR : priceInInr;
      return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(converted);
    },
    [currency],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

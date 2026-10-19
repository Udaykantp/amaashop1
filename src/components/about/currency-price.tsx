"use client";

import { useCurrency } from "@/store/currency-provider";

export function CurrencyPrice({ amount }: { amount: number }) {
  const { formatPrice } = useCurrency();
  return <span className="font-semibold">{formatPrice(amount)}</span>;
}

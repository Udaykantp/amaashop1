import "server-only";
import type { Retailer } from "@/server/enums";
import { formatINR } from "@/server/money";
import { getMockProductBySlug, MOCK_PRODUCTS } from "@/lib/data/mock-catalog";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import Decimal from "decimal.js";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { CompetitorPriceDoc, ProductVariantDoc } from "@/server/models";
import { log } from "@/server/log";
import { moneyFromFirestore, moneyToFirestore } from "@/server/money";
import { fetchCompetitorPrices } from "@/server/pricing/scraper-client";
*/

export type RetailerComparison = {
  retailer: Retailer;
  price: string | null;
  priceValue: number | null;
  currency: string;
  sourceUrl: string | null;
  inStock: boolean;
  lastUpdated: string;
};

export type CompetitorComparison = {
  sku: string;
  variantLabel: string;
  ourPrice: string;
  ourPriceValue: number;
  competitors: RetailerComparison[];
  cheapest: Retailer | null;
  refreshedNow: boolean;
  fromCache: boolean;
};

export async function getCompetitorComparisonByProduct(
  productSku: string,
  _opts: { forceRefresh?: boolean } = {},
): Promise<CompetitorComparison | null> {
  const product = MOCK_PRODUCTS.find((p) => p.sku === productSku || p.id === productSku);
  const price = product?.price ?? 199;
  const amazonPrice = Math.round(price * 1.25);
  const flipkartPrice = Math.round(price * 1.30);
  const jioMartPrice = Math.round(price * 1.18);

  return {
    sku: productSku,
    variantLabel: product?.unit ?? "Standard Pack",
    ourPrice: formatINR(price),
    ourPriceValue: price,
    competitors: [
      {
        retailer: "AMAZON" as Retailer,
        price: formatINR(amazonPrice),
        priceValue: amazonPrice,
        currency: "INR",
        sourceUrl: "https://www.amazon.in",
        inStock: true,
        lastUpdated: new Date(Date.now() - 3 * 3600e3).toISOString(),
      },
      {
        retailer: "FLIPKART" as Retailer,
        price: formatINR(flipkartPrice),
        priceValue: flipkartPrice,
        currency: "INR",
        sourceUrl: "https://www.flipkart.com",
        inStock: true,
        lastUpdated: new Date(Date.now() - 5 * 3600e3).toISOString(),
      },
      {
        retailer: "JIOMART" as Retailer,
        price: formatINR(jioMartPrice),
        priceValue: jioMartPrice,
        currency: "INR",
        sourceUrl: "https://www.jiomart.com",
        inStock: true,
        lastUpdated: new Date(Date.now() - 2 * 3600e3).toISOString(),
      },
    ],
    cheapest: null, // AmaaShop is the most competitive
    refreshedNow: false,
    fromCache: true,
  };
}

export async function getCompetitorComparison(
  sku: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<CompetitorComparison | null> {
  return getCompetitorComparisonByProduct(sku, opts);
}

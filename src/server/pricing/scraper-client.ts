import "server-only";
import Decimal from "decimal.js";
import type { Retailer } from "@/server/enums";
import { log } from "@/server/log";

/**
 * Competitor-price scraping integration.
 *
 * In production this calls a third-party scraping API (ScrapingBee / Bright
 * Data / Oxylabs / a self-hosted worker) that resolves a SKU to live prices on
 * Amazon, Flipkart and JioMart. That call is slow (seconds) and metered, which
 * is exactly why results are cached in Postgres — see
 * `src/server/pricing/competitor-cache.ts`.
 *
 * When `SCRAPER_API_URL` / `SCRAPER_API_KEY` are unset (local dev, CI, preview)
 * this returns deterministic mock quotes so the whole feature is exercisable
 * without a paid account.
 */

const RETAILERS = ["AMAZON", "FLIPKART", "JIOMART"] as const satisfies readonly Retailer[];

export type CompetitorQuote = {
  retailer: Retailer;
  /** null = no match found / retailer unreachable. */
  price: Decimal | null;
  currency: "INR";
  sourceUrl: string | null;
  inStock: boolean;
};

type ScraperConfig = { url: string; key: string; timeoutMs: number };

function readConfig(): ScraperConfig | null {
  const url = process.env.SCRAPER_API_URL?.trim();
  const key = process.env.SCRAPER_API_KEY?.trim();
  if (!url || !key) return null;
  return { url, key, timeoutMs: Number(process.env.SCRAPER_API_TIMEOUT_MS ?? 15_000) };
}

/** Shape we expect back from the real scraping API. */
type ScraperResponse = {
  results: Array<{
    retailer: string;
    price: number | string | null;
    url?: string | null;
    inStock?: boolean;
  }>;
};

/**
 * Fetch live competitor prices for a SKU. Never throws — on any failure it
 * returns a full set of "no data" quotes so the caller can decide whether to
 * fall back to a stale cache.
 */
export async function fetchCompetitorPrices(
  sku: string,
  ourSellingPrice: Decimal,
): Promise<CompetitorQuote[]> {
  const config = readConfig();
  if (!config) return mockQuotes(sku, ourSellingPrice);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({ sku, retailers: RETAILERS }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      log.warn("scraper API non-2xx", { sku, status: res.status });
      return emptyQuotes();
    }

    const data = (await res.json()) as ScraperResponse;
    const byRetailer = new Map(
      data.results.map((r) => [r.retailer.toUpperCase(), r] as const),
    );

    return RETAILERS.map((retailer) => {
      const hit = byRetailer.get(retailer);
      return {
        retailer,
        price: hit?.price != null ? new Decimal(hit.price) : null,
        currency: "INR" as const,
        sourceUrl: hit?.url ?? null,
        inStock: hit?.inStock ?? false,
      };
    });
  } catch (err) {
    log.warn("scraper API call failed", { sku, err: String(err) });
    return emptyQuotes();
  } finally {
    clearTimeout(timer);
  }
}

function emptyQuotes(): CompetitorQuote[] {
  return RETAILERS.map((retailer) => ({
    retailer,
    price: null,
    currency: "INR" as const,
    sourceUrl: null,
    inStock: false,
  }));
}

// ── mock ────────────────────────────────────────────────────────────────────

/**
 * Deterministic pseudo-quotes derived from the SKU so repeated dev runs are
 * stable. Models AmaaShop's real positioning — direct-from-brand, so it sits at
 * or below marketplace prices which carry a seller markup: Amazon +2–9%,
 * Flipkart +5–15%, JioMart +1–8%, with Flipkart occasionally out of stock.
 * Real deployments replace this entirely via SCRAPER_API_URL / SCRAPER_API_KEY.
 */
function mockQuotes(sku: string, ourPrice: Decimal): CompetitorQuote[] {
  const seed = [...sku].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  const jitter = (salt: number) => (((seed ^ (salt * 2654435761)) >>> 0) % 1000) / 10_000; // 0–10%

  const spec: Array<{ retailer: Retailer; delta: number; host: string; oos: boolean }> = [
    { retailer: "AMAZON", delta: 0.02 + jitter(1) * 0.7, host: "www.amazon.in", oos: false },
    { retailer: "FLIPKART", delta: 0.05 + jitter(2), host: "www.flipkart.com", oos: seed % 9 === 0 },
    { retailer: "JIOMART", delta: 0.01 + jitter(3) * 0.7, host: "www.jiomart.com", oos: false },
  ];

  return spec.map(({ retailer, delta, host, oos }) => ({
    retailer,
    price: oos
      ? null
      : new Decimal(ourPrice.toNumber() * (1 + delta)).toDecimalPlaces(
          2,
          Decimal.ROUND_HALF_UP,
        ),
    currency: "INR" as const,
    sourceUrl: `https://${host}/s?k=${encodeURIComponent(sku)}`,
    inStock: !oos,
  }));
}

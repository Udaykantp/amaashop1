import "server-only";
import Decimal from "decimal.js";
import type { Retailer } from "@/server/enums";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { CompetitorPriceDoc, ProductVariantDoc } from "@/server/models";
import { log } from "@/server/log";
import { formatINR, moneyFromFirestore, moneyToFirestore } from "@/server/money";
import { fetchCompetitorPrices } from "@/server/pricing/scraper-client";

/**
 * Read-through cache for competitor prices.
 *
 *   getCompetitorComparison(sku)
 *     ├─ variant + its cached CompetitorPrice rows are read from Firestore
 *     ├─ if every row is younger than the TTL  → return the cache (no network)
 *     └─ otherwise                             → call the scraping API, upsert
 *                                                the rows, return the fresh set
 *
 * The frontend therefore serves from Firestore on all but ~one request per SKU
 * per TTL window. A refresh failure falls back to whatever stale rows exist so
 * the PDP never shows an empty comparison.
 */

const DEFAULT_TTL_HOURS = 24;

function ttlMs(): number {
  const h = Number(process.env.COMPETITOR_PRICE_TTL_HOURS ?? DEFAULT_TTL_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
}

/** True when there is no snapshot yet, or the oldest one has aged past the TTL. */
export function isStale(rows: Array<{ lastUpdated: Date }>, retailerCount = 3): boolean {
  if (rows.length < retailerCount) return true;
  const oldest = Math.min(...rows.map((r) => r.lastUpdated.getTime()));
  return Date.now() - oldest > ttlMs();
}

export type RetailerComparison = {
  retailer: Retailer;
  price: string | null; // "₹1,234.50" — display only
  priceValue: number | null; // for sorting / "cheapest" badge on the client
  currency: string;
  sourceUrl: string | null;
  inStock: boolean;
  lastUpdated: string; // ISO
};

export type CompetitorComparison = {
  sku: string;
  variantLabel: string;
  ourPrice: string;
  ourPriceValue: number;
  competitors: RetailerComparison[];
  /** cheapest retailer at or below our price, if any */
  cheapest: Retailer | null;
  refreshedNow: boolean;
  fromCache: boolean;
};

/** In-flight refreshes keyed by SKU — collapses a thundering herd (many PDP
 *  hits the moment a cache entry expires) into a single upstream call. */
const inflight = new Map<string, Promise<CompetitorComparison | null>>();

interface VariantRecord {
  id: string;
  data: ProductVariantDoc;
}

async function findVariantBySku(sku: string): Promise<VariantRecord | null> {
  const snap = await db().collection(Collections.productVariants).where("sku", "==", sku).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0]!.id, data: snap.docs[0]!.data() as ProductVariantDoc };
}

async function competitorRows(variantId: string): Promise<{ retailer: Retailer; data: CompetitorPriceDoc }[]> {
  const snap = await db().collection(Collections.competitorPrices).where("variantId", "==", variantId).get();
  return snap.docs.map((d) => ({ retailer: (d.data() as CompetitorPriceDoc).retailer, data: d.data() as CompetitorPriceDoc }));
}

/**
 * PDP entry point — resolves a `Product.sku` to its default (lightest active)
 * variant and returns that variant's comparison. `null` when the product has
 * no active variant or no competitor data at all.
 */
export async function getCompetitorComparisonByProduct(
  productSku: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<CompetitorComparison | null> {
  const productSnap = await db().collection(Collections.products).where("sku", "==", productSku).limit(1).get();
  if (productSnap.empty) return null;
  const variantSnap = await db()
    .collection(Collections.productVariants)
    .where("productId", "==", productSnap.docs[0]!.id)
    .where("isActive", "==", true)
    .orderBy("weightGrams", "asc")
    .limit(1)
    .get();
  if (variantSnap.empty) return null;
  const variant = variantSnap.docs[0]!.data() as ProductVariantDoc;
  return getCompetitorComparison(variant.sku, opts);
}

export async function getCompetitorComparison(
  sku: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<CompetitorComparison | null> {
  const variant = await findVariantBySku(sku);
  if (!variant || !variant.data.isActive) return null;

  const rows = await competitorRows(variant.id);
  const rowsForStaleCheck = rows.map((r) => ({ lastUpdated: r.data.lastUpdated.toDate() }));

  const fresh = !opts.forceRefresh && !isStale(rowsForStaleCheck);
  if (fresh) {
    return shape(variant.data, rows, { refreshedNow: false, fromCache: true });
  }

  const existing = inflight.get(sku);
  if (existing) return existing;

  const job = refresh(sku, variant).finally(() => inflight.delete(sku));
  inflight.set(sku, job);
  return job;
}

async function refresh(sku: string, variant: VariantRecord): Promise<CompetitorComparison | null> {
  try {
    const quotes = await fetchCompetitorPrices(sku, moneyFromFirestore(variant.data.sellingPrice));

    const firestore = db();
    const batch = firestore.batch();
    for (const q of quotes) {
      const ref = doc(Collections.competitorPrices, `${variant.id}_${q.retailer}`);
      const data: CompetitorPriceDoc = {
        variantId: variant.id,
        retailer: q.retailer,
        price: q.price ? moneyToFirestore(q.price) : null,
        currency: q.currency,
        sourceUrl: q.sourceUrl,
        inStock: q.inStock,
        lastUpdated: nowSentinel(),
      };
      batch.set(ref, data);
    }
    await batch.commit();

    const rows = await competitorRows(variant.id);
    log.info("competitor prices refreshed", { sku, retailers: rows.length });
    return shape(variant.data, rows, { refreshedNow: true, fromCache: false });
  } catch (err) {
    log.warn("competitor price refresh failed; serving stale", { sku, err: String(err) });
    const rows = await competitorRows(variant.id);
    if (rows.length === 0) return null;
    return shape(variant.data, rows, { refreshedNow: false, fromCache: true });
  }
}

// ── shaping ─────────────────────────────────────────────────────────────────

function shape(
  variant: Pick<ProductVariantDoc, "sku" | "label" | "sellingPrice">,
  rows: { retailer: Retailer; data: CompetitorPriceDoc }[],
  meta: { refreshedNow: boolean; fromCache: boolean },
): CompetitorComparison {
  const ourValue = Number(variant.sellingPrice);

  const competitors: RetailerComparison[] = rows
    .map(({ retailer, data: r }) => ({
      retailer,
      price: r.price ? formatINR(new Decimal(r.price)) : null,
      priceValue: r.price ? Number(r.price) : null,
      currency: r.currency,
      sourceUrl: r.sourceUrl,
      inStock: r.inStock,
      lastUpdated: r.lastUpdated.toDate().toISOString(),
    }))
    .sort((a, b) => a.retailer.localeCompare(b.retailer));

  const undercutting = competitors
    .filter((c) => c.inStock && c.priceValue != null && c.priceValue <= ourValue)
    .sort((a, b) => (a.priceValue ?? 0) - (b.priceValue ?? 0));

  return {
    sku: variant.sku,
    variantLabel: variant.label,
    ourPrice: formatINR(new Decimal(variant.sellingPrice)),
    ourPriceValue: ourValue,
    competitors,
    cheapest: undercutting[0]?.retailer ?? null,
    ...meta,
  };
}

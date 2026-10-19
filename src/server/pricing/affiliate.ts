import "server-only";
import type { Retailer } from "@/server/enums";
import { Collections, db, doc, increment } from "@/server/firestore";
import type { AffiliateLinkDoc, CompetitorPriceDoc } from "@/server/models";

/**
 * Curated outbound affiliate links for a product's price-comparison row.
 * Editable in /admin/catalog; consumed by the `/api/out` redirect route.
 */

const RETAILERS: Retailer[] = ["AMAZON", "FLIPKART", "JIOMART"];

export type AffiliateLinkRow = {
  retailer: Retailer;
  url: string;
  enabled: boolean;
  clicks: number;
};

/** All three retailers, blanks filled — for the admin editor. */
export async function listAffiliateLinks(productId: string): Promise<AffiliateLinkRow[]> {
  const snap = await db().collection(Collections.affiliateLinks).where("productId", "==", productId).get();
  const byRetailer = new Map(snap.docs.map((d) => [(d.data() as AffiliateLinkDoc).retailer, d.data() as AffiliateLinkDoc]));
  return RETAILERS.map((retailer) => {
    const r = byRetailer.get(retailer);
    return { retailer, url: r?.url ?? "", enabled: r?.enabled ?? true, clicks: r?.clicks ?? 0 };
  });
}

/**
 * Where an outbound "View on <retailer>" click should land: an enabled
 * affiliate link if one is set, otherwise the scraped competitor product URL
 * for the product's default variant. Increments the affiliate click counter.
 * Returns `null` when there is nothing to link to.
 */
export async function resolveOutbound(productId: string, retailer: Retailer): Promise<string | null> {
  const firestore = db();
  const affiliateRef = doc(Collections.affiliateLinks, `${productId}_${retailer}`);
  const affiliateSnap = await affiliateRef.get();
  const affiliate = affiliateSnap.exists ? (affiliateSnap.data() as AffiliateLinkDoc) : null;

  if (affiliate?.enabled && affiliate.url) {
    // Fire-and-forget — a redirect must not wait on analytics.
    void affiliateRef.update({ clicks: increment(1) }).catch(() => {});
    return affiliate.url;
  }

  const variantSnap = await firestore
    .collection(Collections.productVariants)
    .where("productId", "==", productId)
    .where("isActive", "==", true)
    .orderBy("weightGrams", "asc")
    .limit(1)
    .get();
  if (variantSnap.empty) return null;
  const variantId = variantSnap.docs[0]!.id;

  const cpSnap = await doc(Collections.competitorPrices, `${variantId}_${retailer}`).get();
  return cpSnap.exists ? (cpSnap.data() as CompetitorPriceDoc).sourceUrl : null;
}

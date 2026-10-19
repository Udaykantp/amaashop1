import { NextResponse, type NextRequest } from "next/server";
import type { Retailer } from "@/server/enums";
import { resolveOutbound } from "@/server/pricing/affiliate";

/**
 * Outbound affiliate redirect. The storefront price-comparison links here
 * ( /api/out?p=<productId>&r=<AMAZON|FLIPKART|JIOMART> ) rather than straight
 * to the retailer, so:
 *   • the affiliate URL is resolved server-side (swap it in /admin/catalog,
 *     no redeploy) and prefers a curated link over the scraped one;
 *   • outbound clicks are counted;
 *   • the retailer never sees our internal URLs as the referrer.
 * Anything unresolved falls back to the homepage.
 */

const RETAILERS = new Set<Retailer>(["AMAZON", "FLIPKART", "JIOMART"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("p")?.trim();
  const retailer = searchParams.get("r")?.trim().toUpperCase() as Retailer | undefined;

  const home = new URL("/", req.url);

  if (!productId || !retailer || !RETAILERS.has(retailer)) {
    return NextResponse.redirect(home, 302);
  }

  try {
    const url = await resolveOutbound(productId, retailer);
    if (!url || !/^https?:\/\//i.test(url)) return NextResponse.redirect(home, 302);

    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch {
    return NextResponse.redirect(home, 302);
  }
}

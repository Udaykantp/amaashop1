import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { log } from "@/server/log";
import { getCompetitorComparison } from "@/server/pricing/competitor-cache";

export const runtime = "nodejs"; // firebase-admin + the scraper client need Node, not Edge
export const dynamic = "force-dynamic";

/**
 * GET /api/compare-price?sku=AMA-ATTA-1KG
 *
 * Returns our price for the variant plus cached (or freshly scraped) Amazon /
 * Flipkart / JioMart prices. The heavy lifting — TTL check, single-flight
 * refresh, stale fallback — is in `getCompetitorComparison`; this handler is
 * just validation + response shaping + light abuse protection.
 *
 * `?refresh=1` forces a live re-scrape and requires the
 * `PRICE_COMPARE_REVALIDATE_SECRET` bearer token (cron / admin only) so
 * arbitrary visitors can't run up the metered scraping bill.
 */

const querySchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU may contain only letters, digits, dot, dash, underscore"),
  refresh: z.enum(["0", "1"]).optional(),
});

// Very small in-process limiter — one PDP shouldn't hammer this, and the real
// backstop is the DB cache. Swap for Cloud Armor / Redis in front of Cloud Run.
const HITS = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = HITS.get(ip);
  if (!cur || now > cur.resetAt) {
    HITS.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > MAX_PER_WINDOW;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = querySchema.safeParse({
    sku: req.nextUrl.searchParams.get("sku") ?? undefined,
    refresh: req.nextUrl.searchParams.get("refresh") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const forceRefresh = parsed.data.refresh === "1";
  if (forceRefresh) {
    const secret = process.env.PRICE_COMPARE_REVALIDATE_SECRET;
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!secret || bearer !== secret) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  try {
    const result = await getCompetitorComparison(parsed.data.sku, { forceRefresh });
    if (!result) {
      return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });
    }

    // Let the CDN/edge hold the response briefly; `stale-while-revalidate`
    // keeps the PDP fast even at the moment our DB cache turns over.
    return NextResponse.json(result, {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    log.error("compare-price failed", { sku: parsed.data.sku, err: String(err) });
    return NextResponse.json({ error: "Price comparison is unavailable." }, { status: 502 });
  }
}

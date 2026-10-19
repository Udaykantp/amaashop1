import { BadgeCheck, Check, ExternalLink, Info, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING } from "@/lib/checkout/pricing";
import { getCompetitorComparisonByProduct } from "@/server/pricing/competitor-cache";
import { cn } from "@/lib/utils";

/**
 * PDP "Price comparison" — the same pack priced across leading marketplaces,
 * with AmaaShop's position and value proposition made explicit. Data comes from
 * the read-through competitor-price cache (Postgres, refreshed on a TTL) — never
 * a live fetch on render. Renders nothing when there is no data.
 */

const AMAASHOP_LOGO = "https://ik.imagekit.io/kxh5yidni/Amaashop/Ammashop.com.png";

const RETAILER: Record<string, { name: string; color: string }> = {
  AMAZON: { name: "Amazon", color: "#FF9900" },
  FLIPKART: { name: "Flipkart", color: "#2874F0" },
  JIOMART: { name: "JioMart", color: "#0C831F" },
};

const WHY = [
  { icon: BadgeCheck, text: "Sold direct by the brand — no marketplace seller markup" },
  { icon: ShieldCheck, text: "100% genuine, factory-sealed packs" },
  { icon: Truck, text: `Free delivery on orders over ${inr(FREE_SHIPPING_THRESHOLD)}` },
  { icon: Check, text: "7-day easy replacement + GST invoice on every order" },
];

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function relTime(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** "500 ml" + 579 → "₹115.80 / 100 ml". null when the label isn't parseable. */
function perUnit(label: string, price: number): string | null {
  const m = label.trim().match(/^([\d.]+)\s*(ml|l|kg|g|gm|pcs?|packs?|units?)\b/i);
  if (!m) return null;
  let qty = parseFloat(m[1]!);
  let unit = m[2]!.toLowerCase();
  if (!qty || !Number.isFinite(qty)) return null;
  if (unit === "kg") {
    qty *= 1000;
    unit = "g";
  } else if (unit === "l") {
    qty *= 1000;
    unit = "ml";
  } else if (unit === "gm") {
    unit = "g";
  }
  if (unit === "ml" || unit === "g") return `₹${((price / qty) * 100).toFixed(2)} / 100 ${unit}`;
  const single = unit.replace(/s$/, "");
  return `₹${(price / qty).toFixed(2)} / ${single}`;
}

export async function PriceComparison({
  productSku,
  productId,
}: {
  productSku: string;
  productId: string;
}) {
  const cmp = await getCompetitorComparisonByProduct(productSku);
  if (!cmp || cmp.competitors.length === 0) return null;

  const listedInStock = cmp.competitors
    .filter((c) => c.inStock && c.priceValue != null)
    .map((c) => ({ ...c, priceValue: c.priceValue as number }));

  const lowestCompetitor = listedInStock.reduce<(typeof listedInStock)[number] | null>(
    (best, c) => (best == null || c.priceValue < best.priceValue ? c : best),
    null,
  );
  const highestCompetitor = listedInStock.reduce<(typeof listedInStock)[number] | null>(
    (worst, c) => (worst == null || c.priceValue > worst.priceValue ? c : worst),
    null,
  );

  const weAreCheapest = !lowestCompetitor || cmp.ourPriceValue <= lowestCompetitor.priceValue;
  const savingVsHighest = highestCompetitor
    ? Math.max(0, highestCompetitor.priceValue - cmp.ourPriceValue)
    : 0;
  const savingPctVsHighest =
    highestCompetitor && highestCompetitor.priceValue > 0
      ? Math.round((savingVsHighest / highestCompetitor.priceValue) * 100)
      : 0;
  const gapToLowest = lowestCompetitor
    ? Math.max(0, cmp.ourPriceValue - lowestCompetitor.priceValue)
    : 0;

  const lastUpdated = cmp.competitors.reduce(
    (a, c) => (c.lastUpdated > a ? c.lastUpdated : a),
    cmp.competitors[0]!.lastUpdated,
  );

  const ourDelivery = cmp.ourPriceValue > FREE_SHIPPING_THRESHOLD ? "Free delivery" : `+ ${inr(STANDARD_SHIPPING)} delivery`;
  const ourPerUnit = perUnit(cmp.variantLabel, cmp.ourPriceValue);

  // Rows for the table (all retailers) + the bar chart (priced only).
  type Row = {
    key: string;
    name: string;
    color: string;
    value: number | null;
    inStock: boolean;
    url: string | null;
    isUs: boolean;
  };
  const rows: Row[] = [
    {
      key: "US",
      name: "AmaaShop",
      color: "#059669",
      value: cmp.ourPriceValue,
      inStock: true,
      url: null,
      isUs: true,
    },
    ...cmp.competitors
      .map((c) => ({
        key: c.retailer as string,
        name: RETAILER[c.retailer]?.name ?? c.retailer,
        color: RETAILER[c.retailer]?.color ?? "#9ca3af",
        value: c.priceValue,
        inStock: c.inStock,
        url: c.sourceUrl,
        isUs: false,
      }))
      .sort((a, b) => {
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        return a.value - b.value;
      }),
  ];

  const chartRows = rows.filter((r) => r.value != null && (r.isUs || r.inStock)) as Array<
    Row & { value: number }
  >;
  const maxValue = Math.max(...chartRows.map((r) => r.value));

  return (
    <section id="price-comparison">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Price comparison</h2>
        <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Updated {relTime(lastUpdated)}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        The same {cmp.variantLabel} pack, priced across leading marketplaces.
      </p>

      {/* Verdict card */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-emerald-100">
              <Image
                src={AMAASHOP_LOGO}
                alt="AmaaShop"
                width={120}
                height={50}
                className="h-6 w-auto"
              />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                AmaaShop price
              </p>
              <p className="text-2xl font-extrabold leading-tight text-neutral-900">
                {inr(cmp.ourPriceValue)}
              </p>
              <p className="text-xs text-neutral-500">
                {ourPerUnit ? `${ourPerUnit} · ` : ""}
                {ourDelivery}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            {weAreCheapest ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <Check size={13} /> Lowest price online
                </span>
                {savingVsHighest >= 1 && (
                  <p className="mt-1.5 text-sm font-medium text-emerald-700">
                    Save up to {inr(savingVsHighest)}
                    {savingPctVsHighest >= 1 ? ` (${savingPctVsHighest}%)` : ""} vs other stores
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-neutral-600 ring-1 ring-neutral-200">
                  {inr(gapToLowest)} above {lowestCompetitor?.retailer
                    ? RETAILER[lowestCompetitor.retailer]?.name
                    : "the lowest"}
                </span>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-neutral-500 sm:ml-auto">
                  Marketplace prices exclude the genuine-pack guarantee, free delivery and 7-day
                  replacement you get here.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div className="space-y-2.5 border-t border-emerald-100 bg-white/60 px-5 py-4">
          {chartRows.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span
                className={cn(
                  "w-20 shrink-0 truncate text-xs font-medium",
                  r.isUs ? "text-emerald-700" : "text-neutral-500",
                )}
              >
                {r.name}
              </span>
              <span className="relative h-6 flex-1 overflow-hidden rounded bg-neutral-100">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded",
                    r.isUs ? "bg-emerald-500" : "bg-neutral-300",
                  )}
                  style={{ width: `${Math.max(6, (r.value / maxValue) * 100)}%` }}
                />
              </span>
              <span
                className={cn(
                  "w-16 shrink-0 text-right text-xs font-bold tabular-nums",
                  r.isUs ? "text-emerald-700" : "text-neutral-700",
                )}
              >
                {inr(r.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2.5">Store</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Per unit</th>
              <th className="px-4 py-2.5 text-right">vs AmaaShop</th>
              <th className="px-4 py-2.5 text-right">Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = r.value != null ? r.value - cmp.ourPriceValue : null;
              const pct =
                delta != null && cmp.ourPriceValue > 0
                  ? Math.round((delta / cmp.ourPriceValue) * 100)
                  : null;
              const pu = r.value != null ? perUnit(cmp.variantLabel, r.value) : null;
              return (
                <tr
                  key={r.key}
                  className={cn(
                    "border-b border-neutral-100 last:border-0",
                    r.isUs && "bg-emerald-50/60",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-semibold text-neutral-900">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: r.color }}
                        aria-hidden
                      />
                      {r.name}
                      {r.isUs && weAreCheapest && (
                        <span className="rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                          Best
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.value == null ? (
                      <span className="text-xs text-neutral-400">Not listed</span>
                    ) : !r.inStock ? (
                      <span className="text-xs text-neutral-400">Out of stock</span>
                    ) : (
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          r.isUs ? "text-emerald-700" : "text-neutral-900",
                        )}
                      >
                        {inr(r.value)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-neutral-500">
                    {pu ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.isUs || delta == null || !r.inStock ? (
                      <span className="text-xs text-neutral-300">—</span>
                    ) : delta === 0 ? (
                      <span className="text-xs font-medium text-neutral-500">Same</span>
                    ) : (
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          delta > 0 ? "text-emerald-600" : "text-red-500",
                        )}
                      >
                        {delta > 0 ? "+" : "−"}
                        {inr(Math.abs(delta))}
                        {pct != null ? ` (${delta > 0 ? "+" : "−"}${Math.abs(pct)}%)` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.isUs ? (
                      <span className="text-xs font-medium text-emerald-600">You are here</span>
                    ) : r.url ? (
                      <a
                        href={`/api/out?p=${encodeURIComponent(productId)}&r=${r.key}`}
                        target="_blank"
                        rel="noopener nofollow sponsored"
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-emerald-600"
                        aria-label={`View on ${r.name}`}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Why AmaaShop */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Image src={AMAASHOP_LOGO} alt="" width={90} height={38} className="h-4 w-auto" />
          Why buy it here
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {WHY.map((w) => (
            <li key={w.text} className="flex items-start gap-2 text-sm text-neutral-600">
              <w.icon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-neutral-400">
        <Info size={13} className="mt-0.5 shrink-0" />
        Prices and availability at Amazon, Flipkart and JioMart are indicative, captured{" "}
        {relTime(lastUpdated)}, and may have changed since. AmaaShop is not affiliated with these
        retailers; trademarks belong to their owners.
      </p>
    </section>
  );
}

export function PriceComparisonSkeleton() {
  return (
    <section>
      <div className="h-6 w-44 animate-pulse rounded bg-neutral-100" />
      <div className="mt-4 h-40 animate-pulse rounded-2xl bg-neutral-100" />
      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-0"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

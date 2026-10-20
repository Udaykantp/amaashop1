/**
 * Pure SEO helpers for the product catalog — shared by the admin form's live
 * preview (client) and the storefront PDP metadata / JSON-LD (server). No
 * `server-only`: keep it dependency-free and isomorphic.
 *
 * Targets Google's current rendering behaviour + schema.org `Product` /
 * Merchant Center requirements.
 */

export const SEO_LIMITS = {
  /** Google truncates the SERP title near ~600px ≈ 60 chars. */
  titleIdealMin: 30,
  titleIdealMax: 60,
  titleHardMax: 70,
  /** Meta description shows ~155–160 chars on desktop. */
  descIdealMin: 70,
  descIdealMax: 155,
  descHardMax: 170,
  /** Thin content threshold for a PDP. */
  descriptionWordsMin: 50,
} as const;

export interface SeoProduct {
  name: string;
  slug: string;
  subtitle?: string | null;
  description?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  gtin?: string | null;
  sku?: string | null;
  mrp: number;
  sellingPrice: number;
  currency?: string;
  imageUrl?: string | null;
  ogImageUrl?: string | null;
  images?: string[];
  rating?: number;
  reviews?: number;
  inStock?: boolean;
}

const clamp = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function productPath(slug: string): string {
  return `/product/${slug}`;
}

export function resolveMetaTitle(p: SeoProduct, siteName: string): string {
  const base = p.metaTitle?.trim() || [p.brand, p.name].filter(Boolean).join(" ") || p.name;
  const withSite = base.toLowerCase().includes(siteName.toLowerCase())
    ? base
    : `${base} | ${siteName}`;
  return clamp(withSite, SEO_LIMITS.titleHardMax);
}

export function resolveMetaDescription(p: SeoProduct): string {
  const raw =
    p.metaDescription?.trim() ||
    p.subtitle?.trim() ||
    (p.description ? stripTags(p.description) : "") ||
    `Buy ${p.name} online${p.brand ? ` from ${p.brand}` : ""}. Genuine products, fast delivery, secure checkout.`;
  return clamp(raw, SEO_LIMITS.descHardMax);
}

export function discountPct(mrp: number, selling: number): number {
  if (!mrp || selling >= mrp) return 0;
  return Math.round(((mrp - selling) / mrp) * 100);
}

export interface JsonLdReview {
  author: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  datePublished: string;
}

/**
 * schema.org/Product JSON-LD. Google requires `name`, `image`, and one of
 * `offers` / `review` / `aggregateRating`; `brand`, `gtin`, `sku` strongly
 * recommended for rich results + Merchant Center.
 *
 * `aggregateRating` / `review` are emitted ONLY from genuine review rows
 * passed in `opts.reviews` — never from a denormalised placeholder count,
 * which would risk a Google manual action.
 */
export function productJsonLd(
  p: SeoProduct,
  opts: { siteUrl: string; siteName: string; reviews?: JsonLdReview[] },
): Record<string, unknown> {
  const url = `${opts.siteUrl}${productPath(p.slug)}`;
  const currency = p.currency ?? "INR";
  const images = (p.images?.length ? p.images : [p.imageUrl].filter(Boolean)) as string[];

  // priceValidUntil: Google warns if absent/expired — roll it a year forward.
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const gtinKey =
    p.gtin && p.gtin.length === 13
      ? "gtin13"
      : p.gtin && p.gtin.length === 12
        ? "gtin12"
        : p.gtin && p.gtin.length === 8
          ? "gtin8"
          : "gtin";

  const brandName = p.brand?.trim() || opts.siteName;

  // Merchant-listing fields Google now expects on Offer — absent/expired values
  // trigger "non-critical" warnings in Search Console and dull the rich result.
  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    shippingRate: {
      "@type": "MonetaryAmount",
      value: "0",
      currency,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6, unitCode: "DAY" },
    },
  };
  const returnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    name: p.name,
    description: resolveMetaDescription(p),
    image: images.length ? images : undefined,
    sku: p.sku ?? undefined,
    mpn: p.sku ?? undefined,
    ...(p.gtin ? { [gtinKey]: p.gtin } : {}),
    brand: { "@type": "Brand", name: brandName },
    ...(p.categoryName ? { category: p.categoryName } : {}),
    offers: {
      "@type": "Offer",
      "@id": `${url}#offer`,
      url,
      priceCurrency: currency,
      price: p.sellingPrice.toFixed(2),
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        p.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: opts.siteName },
      shippingDetails,
      hasMerchantReturnPolicy: returnPolicy,
    },
    ...reviewGraph(opts.reviews),
  };
}

/** aggregateRating + review[] from genuine reviews only (empty otherwise). */
function reviewGraph(reviews?: JsonLdReview[]): Record<string, unknown> {
  if (!reviews || reviews.length === 0) return {};
  const sum = reviews.reduce((n, r) => n + r.rating, 0);
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (sum / reviews.length).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 20).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.author },
      datePublished: r.datePublished.slice(0, 10),
      ...(r.title ? { name: r.title } : {}),
      reviewBody: r.body,
    })),
  };
}

// ── on-page SEO audit (Yoast-style) ────────────────────────────────────────

export type CheckStatus = "pass" | "warn" | "fail";
export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  hint: string;
}

export function runSeoChecks(p: SeoProduct, siteName = "AmaaShop"): SeoCheck[] {
  const title = resolveMetaTitle(p, siteName);
  const desc = resolveMetaDescription(p);
  const kw = p.focusKeyword?.trim().toLowerCase() ?? "";
  const bodyText = stripTags(p.description ?? "").toLowerCase();
  const words = bodyText ? bodyText.split(/\s+/).length : 0;
  const checks: SeoCheck[] = [];

  const push = (id: string, label: string, ok: boolean, warn: boolean, hint: string) =>
    checks.push({ id, label, status: ok ? "pass" : warn ? "warn" : "fail", hint });

  push(
    "title-len",
    "Title length",
    title.length >= SEO_LIMITS.titleIdealMin && title.length <= SEO_LIMITS.titleIdealMax,
    title.length <= SEO_LIMITS.titleHardMax,
    `${title.length} chars — aim for ${SEO_LIMITS.titleIdealMin}–${SEO_LIMITS.titleIdealMax}.`,
  );
  push(
    "desc-len",
    "Meta description length",
    desc.length >= SEO_LIMITS.descIdealMin && desc.length <= SEO_LIMITS.descIdealMax,
    desc.length <= SEO_LIMITS.descHardMax,
    `${desc.length} chars — aim for ${SEO_LIMITS.descIdealMin}–${SEO_LIMITS.descIdealMax}.`,
  );
  push(
    "desc-set",
    "Custom meta description",
    Boolean(p.metaDescription?.trim()),
    true,
    "Write a unique description instead of letting it fall back to the body copy.",
  );
  push(
    "slug",
    "Readable slug",
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) && p.slug.length <= 60,
    p.slug.length <= 75,
    "Lowercase words separated by hyphens, no stop-word soup.",
  );
  if (kw) {
    push(
      "kw-title",
      "Focus keyword in title",
      title.toLowerCase().includes(kw),
      false,
      `Add “${p.focusKeyword}” to the title.`,
    );
    push(
      "kw-desc",
      "Focus keyword in meta description",
      desc.toLowerCase().includes(kw),
      false,
      `Work “${p.focusKeyword}” into the meta description.`,
    );
    push(
      "kw-slug",
      "Focus keyword in slug",
      p.slug.includes(kw.replace(/\s+/g, "-")),
      true,
      `Ideally the slug contains “${p.focusKeyword}”.`,
    );
    push(
      "kw-body",
      "Focus keyword in description",
      bodyText.includes(kw),
      false,
      `Mention “${p.focusKeyword}” in the product description.`,
    );
  } else {
    push("kw-set", "Focus keyword", false, true, "Set a primary target phrase to unlock keyword checks.");
  }
  push(
    "body-len",
    "Description depth",
    words >= 120,
    words >= SEO_LIMITS.descriptionWordsMin,
    `${words} words — 120+ reads as substantial, thin content ranks poorly.`,
  );
  push(
    "image",
    "Primary image",
    Boolean(p.imageUrl || p.images?.length),
    false,
    "At least one product image is required for rich results.",
  );
  push(
    "alt",
    "Image alt text",
    Boolean(p.images?.length) || Boolean(p.imageUrl),
    true,
    "Describe each image for accessibility + Google Images.",
  );
  push("gtin", "Barcode (GTIN)", Boolean(p.gtin?.trim()), true, "EAN/UPC lets Google match your offer across the web + Merchant Center.");
  push("brand", "Brand", Boolean(p.brand?.trim()), true, "Brand is a recommended structured-data field.");
  push(
    "index",
    "Indexable",
    !p.noIndex,
    true,
    p.noIndex ? "This product is set to noindex — it will not appear in search." : "Search engines may index this page.",
  );

  return checks;
}

export function seoScore(checks: SeoCheck[]): number {
  if (!checks.length) return 0;
  const pts = checks.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}

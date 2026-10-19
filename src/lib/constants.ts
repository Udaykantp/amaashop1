export const SITE_NAME = "AmaaShop";
export const SITE_LEGAL_NAME = "AmaaShop";

/** One-line positioning — used in the <title> default and OG. Keep ≤ ~62 chars. */
export const SITE_TAGLINE =
  "Herbal Personal Care, Natural Home Care & Everyday Essentials";

/** Meta description default (~150 chars). Describes what the store actually sells. */
export const SITE_DESCRIPTION =
  "AmaaShop is an Indian D2C brand for everyday essentials — herbal personal care, natural home care, tea, pooja items and groceries. Genuine products, honest prices, fast delivery across India.";

/** Short blurb for JSON-LD / manifest. */
export const SITE_DESCRIPTION_SHORT =
  "Herbal personal care, natural home care, tea, pooja items and groceries — genuine AmaaShop products delivered across India.";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** BCP-47 for <html lang> and schema `inLanguage`. */
export const SITE_LOCALE = "en-IN";
/** Open Graph locale form. */
export const SITE_OG_LOCALE = "en_IN";

/** Canonical logo — absolute, used in Organization JSON-LD + OG fallback. */
export const SITE_LOGO_URL =
  "https://ik.imagekit.io/kxh5yidni/Amaashop/favicon-Amashop.com";

/** Public social / knowledge-graph profiles. Fill in as they go live. */
export const ORG_SAME_AS: string[] = [];

/** Customer support contact — surfaced in Organization JSON-LD. */
export const SUPPORT_EMAIL = "support@amaashop.in";

/**
 * Registered business address / phone. Empty by default — set these env vars
 * (App Hosting → Environment, or apphosting.yaml) to activate `PostalAddress`
 * on the Organization and, if there's a walk-in storefront, a `Store` node:
 *   NEXT_PUBLIC_BUSINESS_STREET, _CITY, _REGION, _POSTAL, _PHONE,
 *   NEXT_PUBLIC_BUSINESS_LAT, _LNG, NEXT_PUBLIC_BUSINESS_STOREFRONT=true
 */
export const BUSINESS = {
  streetAddress: process.env.NEXT_PUBLIC_BUSINESS_STREET ?? "",
  addressLocality: process.env.NEXT_PUBLIC_BUSINESS_CITY ?? "",
  addressRegion: process.env.NEXT_PUBLIC_BUSINESS_REGION ?? "",
  postalCode: process.env.NEXT_PUBLIC_BUSINESS_POSTAL ?? "",
  addressCountry: "IN",
  telephone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "",
  latitude: process.env.NEXT_PUBLIC_BUSINESS_LAT ?? "",
  longitude: process.env.NEXT_PUBLIC_BUSINESS_LNG ?? "",
  hasStorefront: process.env.NEXT_PUBLIC_BUSINESS_STOREFRONT === "true",
};

export const hasBusinessAddress = Boolean(
  BUSINESS.streetAddress && BUSINESS.addressLocality && BUSINESS.postalCode,
);

/** Broad keyword themes (metadata.keywords is a weak signal, but harmless). */
export const SITE_KEYWORDS = [
  "AmaaShop",
  "herbal personal care",
  "natural home care",
  "ayurvedic soap",
  "handmade soap",
  "herbal tea",
  "pooja samagri",
  "agarbatti",
  "detergent powder",
  "dishwash",
  "online grocery India",
  "D2C FMCG India",
];

/** Storefront category quick-links (footer / mega-menu). Mirrors the live catalog. */
export const CATEGORY_LINKS = [
  "Personal Care",
  "Home Care",
  "Tea & Coffee",
  "Health & Wellness",
  "Pooja & Devotional",
  "Masala & Oils",
  "Snacks & Namkeen",
  "Staples & Grains",
];

/**
 * Same quick-links, but as {name, slug} so links can target the clean
 * `/category/<slug>` routes directly (no redirect hop). Slugs match
 * scripts/seed-catalog.ts.
 */
export const CATEGORY_NAV: { name: string; slug: string }[] = [
  { name: "Personal Care", slug: "personal-care" },
  { name: "Home Care", slug: "home-care" },
  { name: "Tea & Coffee", slug: "tea-coffee" },
  { name: "Health & Wellness", slug: "health-wellness" },
  { name: "Pooja & Devotional", slug: "devotional" },
  { name: "Masala & Oils", slug: "masala-oils" },
  { name: "Snacks & Namkeen", slug: "snacks-namkeen" },
  { name: "Staples & Grains", slug: "staples-grains" },
];

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const CART_COOKIE = "amaashop_cart";
export const WISHLIST_COOKIE = "amaashop_wishlist";

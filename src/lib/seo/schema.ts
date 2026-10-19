import "server-only";
import {
  BUSINESS,
  ORG_SAME_AS,
  SITE_DESCRIPTION_SHORT,
  SITE_LEGAL_NAME,
  SITE_LOCALE,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  hasBusinessAddress,
} from "@/lib/constants";
import type { Product } from "@/lib/types";

/** schema.org PostalAddress from the configured business address, or null. */
function postalAddress() {
  if (!hasBusinessAddress) return null;
  return {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    ...(BUSINESS.addressRegion ? { addressRegion: BUSINESS.addressRegion } : {}),
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  };
}

/** Stable @id anchors so every graph node cross-references the same entity. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/**
 * Organization / OnlineStore — the brand entity. One per site, rendered in the
 * root layout. Drives the Google knowledge panel + merchant identity.
 */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": ORG_ID,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO_URL,
      contentUrl: SITE_LOGO_URL,
      caption: `${SITE_NAME} logo`,
    },
    image: SITE_LOGO_URL,
    description: SITE_DESCRIPTION_SHORT,
    email: SUPPORT_EMAIL,
    areaServed: { "@type": "Country", name: "India" },
    currenciesAccepted: "INR",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        ...(BUSINESS.telephone ? { telephone: BUSINESS.telephone } : {}),
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    ],
    ...(postalAddress() ? { address: postalAddress() } : {}),
    ...(BUSINESS.telephone ? { telephone: BUSINESS.telephone } : {}),
    ...(ORG_SAME_AS.length ? { sameAs: ORG_SAME_AS } : {}),
  };
}

/**
 * A physical `Store` node — emitted ONLY when a real address is configured AND
 * NEXT_PUBLIC_BUSINESS_STOREFRONT=true (i.e. customers can actually visit).
 * Returns null for a pure e-commerce operation.
 */
export function localBusinessSchema() {
  const address = postalAddress();
  if (!address || !BUSINESS.hasStorefront) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    image: SITE_LOGO_URL,
    description: SITE_DESCRIPTION_SHORT,
    address,
    ...(BUSINESS.telephone ? { telephone: BUSINESS.telephone } : {}),
    ...(BUSINESS.latitude && BUSINESS.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: BUSINESS.latitude,
            longitude: BUSINESS.longitude,
          },
        }
      : {}),
    areaServed: { "@type": "Country", name: "India" },
    currenciesAccepted: "INR",
    parentOrganization: { "@id": ORG_ID },
  };
}

/**
 * WebSite node with a SearchAction — makes AmaaShop eligible for the Google
 * sitelinks search box, and ties pages back to the brand as `publisher`.
 */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    inLanguage: SITE_LOCALE,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

/** Lightweight ItemList — position + name + url + image per entry. */
export function itemListSchema(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      image: product.image_url || undefined,
      url: `${SITE_URL}/product/${product.slug}`,
    })),
  };
}

/**
 * CollectionPage for the shop / a category listing — wraps an ItemList whose
 * members are full Product nodes with Offers, which is what Google reads for
 * collection / merchant-listing rich results.
 */
export function collectionPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  products: Product[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${abs(opts.url)}#collection`,
    url: abs(opts.url),
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.products.length,
      itemListElement: opts.products.slice(0, 40).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          url: `${SITE_URL}/product/${p.slug}`,
          image: p.image_url || undefined,
          ...(p.categories?.name ? { category: p.categories.name } : {}),
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: p.price.toFixed(2),
            availability:
              p.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        },
      })),
    },
  };
}

/**
 * Minimal Product schema kept for callers that only have the list-shaped
 * `Product`. The PDP uses the richer `productJsonLd` in lib/catalog/seo.ts.
 */
export function productSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ? [product.image_url] : undefined,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.categories?.name,
    ...(product.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.rating).toFixed(1),
            reviewCount: product.reviews,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "INR",
      price: product.price.toFixed(2),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
}

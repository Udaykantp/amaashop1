import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductBreadcrumb } from "@/components/product/product-breadcrumb";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { ProductOffers } from "@/components/product/product-offers";
import { ProductHighlights } from "@/components/product/product-highlights";
import { ProductSpecs } from "@/components/product/product-specs";
import { RatingsSummary } from "@/components/product/ratings-summary";
import { PriceComparison, PriceComparisonSkeleton } from "@/components/product/price-comparison";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { PurchaseControls } from "@/components/product/purchase-controls";
import { TrustBadges } from "@/components/product/trust-badges";
import { RelatedProducts } from "@/components/product/related-products";
import { RelatedProductsSkeleton } from "@/components/skeletons/related-products-skeleton";
import { getAllProductSlugs, getProductDetailBySlug, getPublishedReviews } from "@/lib/data/products";
import type { PublicProductDetail } from "@/lib/data/products";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { productJsonLd, resolveMetaDescription, resolveMetaTitle, type SeoProduct } from "@/lib/catalog/seo";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const products = await getAllProductSlugs();
    return products.map(({ slug }) => ({ slug }));
  } catch (err) {
    // DB unreachable at build/params time (e.g. the local dev Postgres isn't
    // running yet). Don't crash the whole route — prebuild nothing and let
    // each product page render on demand (`dynamicParams` stays true).
    console.warn("generateStaticParams(product): could not list slugs —", (err as Error).message);
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

function toSeoProduct(p: PublicProductDetail): SeoProduct {
  return {
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle,
    description: p.description,
    brand: p.brand,
    categoryName: p.categories?.name ?? null,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    focusKeyword: p.focusKeyword,
    canonicalUrl: p.canonicalUrl,
    noIndex: p.noIndex,
    gtin: p.gtin,
    sku: p.sku,
    mrp: p.old_price ?? p.price,
    sellingPrice: p.price,
    imageUrl: p.image_url,
    ogImageUrl: p.ogImageUrl,
    images: p.images.map((i) => i.url),
    rating: p.rating,
    reviews: p.reviews,
    inStock: p.stock > 0,
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) {
    return { title: "Product Not Found", robots: { index: false, follow: false } };
  }

  const seo = toSeoProduct(product);
  const description = resolveMetaDescription(seo);
  // Prefer a real raster product photo for the social card. When there's only
  // an inline SVG / data-URI (or nothing), leave `images` unset so Next falls
  // back to the generated branded card in opengraph-image.tsx.
  const candidate = product.ogImageUrl || product.image_url || "";
  const rasterPhoto = /^https?:\/\/\S+\.(?:png|jpe?g|webp|avif)(?:\?|$)/i.test(candidate)
    ? candidate
    : /^https?:\/\/(?:images\.unsplash\.com|ik\.imagekit\.io|.*\.googleusercontent\.com|storage\.googleapis\.com|firebasestorage\.googleapis\.com)\//i.test(candidate)
      ? candidate
      : null;

  return {
    // Respect an explicit meta title exactly; otherwise let the "%s | AmaaShop"
    // template add the brand.
    title: product.metaTitle ? { absolute: product.metaTitle } : product.name,
    description,
    keywords: product.focusKeyword ? [product.focusKeyword] : undefined,
    alternates: { canonical: product.canonicalUrl || `/product/${product.slug}` },
    robots: product.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: resolveMetaTitle(seo, SITE_NAME),
      description,
      url: `${SITE_URL}/product/${product.slug}`,
      ...(rasterPhoto
        ? { images: [{ url: rasterPhoto, width: 1200, height: 630, alt: product.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: resolveMetaTitle(seo, SITE_NAME),
      description,
      ...(rasterPhoto ? { images: [rasterPhoto] } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) notFound();

  const reviews = await getPublishedReviews(product.id).catch(() => []);
  const jsonLdReviews = reviews.map((r) => ({
    author: r.author,
    rating: r.rating,
    title: r.title,
    body: r.body,
    datePublished: r.createdAt,
  }));

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    ...(product.categories
      ? [
          {
            name: product.categories.name,
            url: `/category/${product.categories.slug}`,
          },
        ]
      : []),
    { name: product.name, url: `/product/${product.slug}` },
  ];

  return (
    <div className="animate-page-enter pb-24 lg:pb-0">
      <JsonLd
        data={productJsonLd(toSeoProduct(product), {
          siteUrl: SITE_URL,
          siteName: SITE_NAME,
          reviews: jsonLdReviews,
        })}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbItems)} />

      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        <ProductBreadcrumb product={product} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-10">
          {/* Media + primary actions — sticky alongside the scrolling details */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery product={product} images={product.images} />
            <PurchaseControls product={product} />
          </div>

          {/* Details */}
          <div className="min-w-0">
            <ProductInfo product={product} />
            <ProductOffers />
            <PincodeChecker />
            <ProductHighlights product={product} />
            <TrustBadges />
          </div>
        </div>

        {/* Full-width detail sections */}
        <div className="mt-8 space-y-8 border-t border-neutral-100 pt-8 lg:mt-14 lg:space-y-12 lg:border-t-0 lg:pt-0">
          <Suspense fallback={<PriceComparisonSkeleton />}>
            <PriceComparison productSku={product.sku} productId={product.id} />
          </Suspense>

          {product.description && (
            <section>
              <h2 className="text-lg font-bold text-neutral-900">Product description</h2>
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-neutral-600">
                {product.description}
              </p>
            </section>
          )}

          <ProductSpecs product={product} />

          <RatingsSummary rating={product.rating} reviews={product.reviews} />
        </div>

        {product.category_id && (
          <Suspense fallback={<RelatedProductsSkeleton />}>
            <RelatedProducts categoryId={product.category_id} excludeId={product.id} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

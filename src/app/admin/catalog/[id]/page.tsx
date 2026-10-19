import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { ProductForm, type ProductFormValues } from "@/components/admin/catalog/product-form";
import { AffiliateLinksPanel } from "@/components/admin/catalog/affiliate-links-panel";
import { ProductStatusBadge } from "@/components/admin/catalog/product-status-badge";
import { PageHeader } from "@/components/patterns/page-header";
import { adminGuardCap } from "@/server/admin/context";
import { getCatalogFormData, getProductForEdit } from "@/server/catalog/products";
import { listAffiliateLinks } from "@/server/pricing/affiliate";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProductForEdit(id).catch(() => null);
  return { title: p ? `${p.name} · Catalog` : "Product" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await adminGuardCap("catalog.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { id } = await params;
  const [product, formData, affiliateLinks] = await Promise.all([
    getProductForEdit(id),
    getCatalogFormData(),
    listAffiliateLinks(id),
  ]);
  if (!product) notFound();

  const initial: Partial<ProductFormValues> = {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    subtitle: product.subtitle ?? "",
    description: product.description ?? "",
    brand: product.brand ?? "",
    categoryId: product.categoryId ?? "",
    status: product.status,
    tagsText: product.tags.join(", "),
    mrp: product.mrp,
    sellingPrice: product.sellingPrice,
    gstRateBps: product.gstRateBps,
    hsnCode: product.hsnCode ?? "",
    gtin: product.gtin ?? "",
    unitLabel: product.unitLabel ?? "",
    weightGrams: product.weightGrams != null ? String(product.weightGrams) : "",
    pv: product.pv,
    bv: product.bv,
    autoshipEligible: product.autoshipEligible,
    images: product.images,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    ogImageUrl: product.ogImageUrl ?? "",
    canonicalUrl: product.canonicalUrl ?? "",
    noIndex: product.noIndex,
    focusKeyword: product.focusKeyword ?? "",
    isFeatured: product.isFeatured,
    isPopular: product.isPopular,
    isLatest: product.isLatest,
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <>
            <span className="font-mono text-xs">{product.sku}</span> ·{" "}
            {product.updatedBy ? `last edited by ${product.updatedBy}` : "not yet edited"} ·{" "}
            {product.stock} in stock
          </>
        }
        action={
          <div className="flex items-center gap-3">
            <ProductStatusBadge status={product.status} />
            <a
              href={`${SITE_URL}/product/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View on store <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link href="/admin/catalog" className="text-sm text-muted-foreground hover:underline">
              ← Catalog
            </Link>
          </div>
        }
      />

      <ProductForm
        key={product.id}
        mode="edit"
        productId={product.id}
        initial={initial}
        categories={formData.categories}
        warehouses={formData.warehouses}
      />

      <div className="mt-6 lg:max-w-[calc(100%-384px)]">
        <AffiliateLinksPanel key={product.id} productId={product.id} initial={affiliateLinks} />
      </div>
    </>
  );
}

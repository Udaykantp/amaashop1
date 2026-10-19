"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { ProductStatus } from "@/server/enums";
import { AuthError, requireCapability } from "@/server/auth/guards";
import { writeAudit } from "@/server/audit";
import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  setProductStatus,
  updateProduct,
  type ProductWriteInput,
} from "@/server/catalog/products";
import { uploadProductImage } from "@/server/storage/product-images";
import { Collections, doc, nowSentinel } from "@/server/firestore";
import type { AffiliateLinkDoc, ProductDoc } from "@/server/models";
import { log } from "@/server/log";

export type CatalogResult =
  | { ok: true; id: string; slug: string; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// ── validation ────────────────────────────────────────────────────────────

const GST_RATES_BPS = [0, 500, 1200, 1800];
const optStr = (max: number) => z.string().trim().max(max).optional().default("");

const imageSchema = z.object({
  url: z.string().url("Each image needs a valid URL"),
  alt: z.string().trim().max(160).optional().default(""),
});

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(160),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by hyphens")
      .optional()
      .or(z.literal("")),
    sku: optStr(40),
    subtitle: optStr(200),
    description: optStr(20000),
    brand: optStr(80),
    categoryId: optStr(40),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),

    mrp: z.number().positive("MRP must be greater than 0").max(10_000_000),
    sellingPrice: z.number().positive("Selling price must be greater than 0").max(10_000_000),
    gstRateBps: z.number().int().refine((v) => GST_RATES_BPS.includes(v), "Pick a valid GST slab"),
    hsnCode: optStr(12),
    gtin: z
      .string()
      .trim()
      .regex(/^(\d{8}|\d{12,14})$/, "GTIN must be 8, 12, 13 or 14 digits")
      .optional()
      .or(z.literal("")),

    unitLabel: optStr(40),
    weightGrams: z.number().int().nonnegative().max(5_000_000).nullable().optional(),

    pv: z.number().nonnegative().max(10_000_000),
    bv: z.number().nonnegative().max(10_000_000),
    autoshipEligible: z.boolean(),

    images: z.array(imageSchema).max(12).default([]),

    metaTitle: optStr(120),
    metaDescription: optStr(320),
    ogImageUrl: z.string().url().optional().or(z.literal("")),
    canonicalUrl: z.string().url().optional().or(z.literal("")),
    noIndex: z.boolean(),
    focusKeyword: optStr(80),

    isFeatured: z.boolean(),
    isPopular: z.boolean(),
    isLatest: z.boolean(),

    openingStock: z.number().int().nonnegative().max(10_000_000).nullable().optional(),
    warehouseId: optStr(40),
  })
  .refine((d) => d.sellingPrice <= d.mrp, {
    path: ["sellingPrice"],
    message: "Selling price can't exceed MRP",
  })
  .refine((d) => d.status !== "ACTIVE" || d.images.length > 0, {
    path: ["images"],
    message: "Add at least one image before publishing",
  })
  .refine((d) => d.status !== "ACTIVE" || (d.description ?? "").trim().length >= 20, {
    path: ["description"],
    message: "Write a description before publishing",
  })
  .refine((d) => d.bv <= d.sellingPrice, {
    path: ["bv"],
    message: "BV shouldn't exceed the selling price",
  });

type ParsedProduct = z.infer<typeof productSchema>;

function toWriteInput(d: ParsedProduct): ProductWriteInput {
  const s = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);
  return {
    name: d.name.trim(),
    slug: s(d.slug),
    sku: s(d.sku),
    subtitle: s(d.subtitle),
    description: s(d.description),
    brand: s(d.brand),
    categoryId: s(d.categoryId),
    tags: d.tags,
    status: d.status as ProductStatus,
    mrp: d.mrp,
    sellingPrice: d.sellingPrice,
    gstRateBps: d.gstRateBps,
    hsnCode: s(d.hsnCode),
    gtin: s(d.gtin),
    unitLabel: s(d.unitLabel),
    weightGrams: d.weightGrams ?? null,
    pv: d.pv,
    bv: d.bv,
    autoshipEligible: d.autoshipEligible,
    images: d.images.map((i) => ({ url: i.url.trim(), alt: i.alt?.trim() || null })),
    metaTitle: s(d.metaTitle),
    metaDescription: s(d.metaDescription),
    ogImageUrl: s(d.ogImageUrl),
    canonicalUrl: s(d.canonicalUrl),
    noIndex: d.noIndex,
    focusKeyword: s(d.focusKeyword),
    isFeatured: d.isFeatured,
    isPopular: d.isPopular,
    isLatest: d.isLatest,
    openingStock: d.openingStock ?? null,
    warehouseId: s(d.warehouseId),
  };
}

function zodFail(err: z.ZodError): CatalogResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: err.issues[0]?.message ?? "Please fix the highlighted fields", fieldErrors };
}

function fail(err: unknown): CatalogResult {
  if (err instanceof z.ZodError) return zodFail(err);
  if (err instanceof AuthError) return { ok: false, error: err.message };
  log.error("catalog action failed", { err: String(err) });
  return { ok: false, error: "Something went wrong. Please try again." };
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/catalog");
  revalidateTag("products");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/product/${slug}`);
}

// ── actions ───────────────────────────────────────────────────────────────

export async function createProductAction(raw: unknown): Promise<CatalogResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const parsed = productSchema.parse(raw);
    const product = await createProduct(toWriteInput(parsed), actor.uid);

    await writeAudit({
      actorUserId: actor.uid,
      action: "product.create",
      entity: "product",
      entityId: product.id,
      after: { sku: product.sku, slug: product.slug, name: parsed.name, status: parsed.status },
    });
    revalidateCatalog(product.slug);
    return { ok: true, id: product.id, slug: product.slug, message: `“${parsed.name}” created.` };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProductAction(id: string, raw: unknown): Promise<CatalogResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const parsed = productSchema.parse(raw);

    const beforeSnap = await doc(Collections.products, id).get();
    if (!beforeSnap.exists) return { ok: false, error: "Product not found." };
    const before = beforeSnap.data() as ProductDoc;

    const product = await updateProduct(id, toWriteInput(parsed), actor.uid);

    await writeAudit({
      actorUserId: actor.uid,
      action: "product.update",
      entity: "product",
      entityId: id,
      before: {
        name: before.name,
        status: before.status,
        sellingPrice: before.sellingPrice,
        mrp: before.mrp,
        pv: before.pv,
        bv: before.bv,
        gstRateBps: before.gstRateBps,
      },
      after: {
        name: parsed.name,
        status: parsed.status,
        sellingPrice: parsed.sellingPrice,
        mrp: parsed.mrp,
        pv: parsed.pv,
        bv: parsed.bv,
        gstRateBps: parsed.gstRateBps,
      },
    });
    revalidateCatalog(product.slug);
    if (before.slug !== product.slug) revalidatePath(`/product/${before.slug}`);
    revalidatePath(`/admin/catalog/${id}`);
    return { ok: true, id, slug: product.slug, message: "Saved." };
  } catch (err) {
    return fail(err);
  }
}

const statusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export async function setProductStatusAction(
  id: string,
  status: z.infer<typeof statusSchema>,
): Promise<CatalogResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const next = statusSchema.parse(status);
    const res = await setProductStatus(id, next as ProductStatus, actor.uid);

    await writeAudit({
      actorUserId: actor.uid,
      action: "product.status",
      entity: "product",
      entityId: id,
      before: { status: res.from },
      after: { status: res.to },
    });
    revalidateCatalog();
    revalidatePath(`/admin/catalog/${id}`);
    return { ok: true, id, slug: "", message: `“${res.name}” is now ${res.to}.` };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireCapability("catalog.write");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No file was received." };
    }
    const { url } = await uploadProductImage(file);
    return { ok: true, url };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    log.error("product image upload failed", { err: String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function duplicateProductAction(id: string): Promise<CatalogResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const copy = await duplicateProduct(id, actor.uid);
    await writeAudit({
      actorUserId: actor.uid,
      action: "product.duplicate",
      entity: "product",
      entityId: copy.id,
      after: { sourceId: id },
    });
    revalidatePath("/admin/catalog");
    return { ok: true, id: copy.id, slug: "", message: "Duplicated as a draft." };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProductAction(id: string): Promise<CatalogResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const deleted = await deleteProduct(id);

    await writeAudit({
      actorUserId: actor.uid,
      action: "product.delete",
      entity: "product",
      entityId: id,
      before: { name: deleted.name, sku: deleted.sku },
    });
    revalidateCatalog();
    return { ok: true, id, slug: "", message: `“${deleted.name}” was deleted.` };
  } catch (err) {
    return fail(err);
  }
}

// ── affiliate links (price-comparison outbound) ───────────────────────────

const affiliateLinkSchema = z.object({
  retailer: z.enum(["AMAZON", "FLIPKART", "JIOMART"]),
  url: z
    .string()
    .trim()
    .url("Enter a valid https:// URL")
    .max(2048)
    .or(z.literal("")),
  enabled: z.boolean(),
});

export type AffiliateLinksResult = { ok: true } | { ok: false; error: string };

/**
 * Replace a product's affiliate links. An empty `url` removes that retailer's
 * row. Used by the "Affiliate links" panel on the product edit page.
 */
export async function setAffiliateLinksAction(
  productId: string,
  raw: unknown,
): Promise<AffiliateLinksResult> {
  try {
    const actor = await requireCapability("catalog.write");
    const links = z.array(affiliateLinkSchema).max(3).parse(raw);

    const productSnap = await doc(Collections.products, productId).get();
    if (!productSnap.exists) return { ok: false, error: "Product not found." };
    const product = productSnap.data() as ProductDoc;

    for (const link of links) {
      const ref = doc(Collections.affiliateLinks, `${productId}_${link.retailer}`);
      if (!link.url) {
        await ref.delete();
        continue;
      }
      const existing = await ref.get();
      const data: AffiliateLinkDoc = {
        productId,
        retailer: link.retailer,
        url: link.url,
        enabled: link.enabled,
        clicks: existing.exists ? (existing.data() as AffiliateLinkDoc).clicks : 0,
        createdAt: existing.exists ? (existing.data() as AffiliateLinkDoc).createdAt : nowSentinel(),
        updatedAt: nowSentinel(),
      };
      await ref.set(data);
    }

    await writeAudit({
      actorUserId: actor.uid,
      action: "product.affiliate_links.update",
      entity: "product",
      entityId: productId,
      after: {
        links: links.map((l) => ({ retailer: l.retailer, hasUrl: Boolean(l.url), enabled: l.enabled })),
      },
    });

    revalidatePath(`/admin/catalog/${productId}`);
    revalidatePath(`/product/${product.slug}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Please check the affiliate links." };
    }
    log.error("setAffiliateLinksAction failed", { err: String(err) });
    return { ok: false, error: "Could not save affiliate links." };
  }
}

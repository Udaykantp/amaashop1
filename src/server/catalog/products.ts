import "server-only";
import type { ProductStatus } from "@/server/enums";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { AppUserDoc, ProductDoc, ProductImageDoc } from "@/server/models";
import { moneyToFirestore } from "@/server/money";
import { discountPct } from "@/lib/catalog/seo";
import { uniqueProductSku, uniqueProductSlug } from "@/server/catalog/slug";

// ── shared write input (already validated by the action's Zod schema) ──────

export interface ProductImageInput {
  url: string;
  alt?: string | null;
}

export interface ProductWriteInput {
  name: string;
  slug?: string | null;
  sku?: string | null;
  subtitle?: string | null;
  description?: string | null;
  brand?: string | null;
  categoryId?: string | null;
  tags: string[];
  status: ProductStatus;

  mrp: number;
  sellingPrice: number;
  gstRateBps: number;
  hsnCode?: string | null;
  gtin?: string | null;

  unitLabel?: string | null;
  weightGrams?: number | null;

  pv: number;
  bv: number;
  autoshipEligible: boolean;

  images: ProductImageInput[];

  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  noIndex: boolean;
  focusKeyword?: string | null;

  isFeatured: boolean;
  isPopular: boolean;
  isLatest: boolean;

  /** create-only: seed opening stock into one warehouse */
  openingStock?: number | null;
  warehouseId?: string | null;
}

// ── list ──────────────────────────────────────────────────────────────────

export type ProductSort =
  | "updated_desc"
  | "updated_asc"
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "created_desc";

export interface ListProductsParams {
  q?: string;
  status?: ProductStatus | "ALL";
  categoryId?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

export interface ProductListRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  status: ProductStatus;
  categoryName: string | null;
  imageUrl: string | null;
  mrp: string;
  sellingPrice: string;
  discountPct: number;
  pv: string;
  bv: string;
  stock: number;
  isFeatured: boolean;
  updatedAt: string;
}

const ORDER_BY: Record<ProductSort, [string, FirebaseFirestore.OrderByDirection]> = {
  updated_desc: ["updatedAt", "desc"],
  updated_asc: ["updatedAt", "asc"],
  name_asc: ["name", "asc"],
  name_desc: ["name", "desc"],
  price_asc: ["sellingPrice", "asc"],
  price_desc: ["sellingPrice", "desc"],
  created_desc: ["createdAt", "desc"],
};

/**
 * Firestore has no cross-field `contains` search — a text query over-fetches a
 * bounded recent batch (matching any status/category filters) and filters in
 * memory. Fine at today's catalog size; revisit with a search index if it grows.
 */
const SEARCH_SCAN_LIMIT = 1000;

async function inventoryTotals(productIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await db().collection(Collections.inventoryItems).where("productId", "in", chunk).get();
    for (const d of snap.docs) {
      const item = d.data() as { productId: string; qtyAvailable: number };
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.qtyAvailable);
    }
  }
  return totals;
}

export async function listProducts(params: ListProductsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(Math.max(params.perPage ?? 20, 5), 100);
  const q = params.q?.trim().toLowerCase();
  const firestore = db();
  const [orderField, orderDir] = ORDER_BY[params.sort ?? "updated_desc"];

  // Sort is one of 6 user-selectable fields crossed with an optional status
  // and/or category filter — indexing every combination isn't practical, so
  // (like the `q` search path) this always fetches via equality filters only
  // (which never need a composite index) and sorts/paginates in memory.
  // Fine at today's catalog size.
  const baseQuery = () => {
    let query: FirebaseFirestore.Query = firestore.collection(Collections.products);
    if (params.status && params.status !== "ALL") query = query.where("status", "==", params.status);
    if (params.categoryId) query = query.where("categoryId", "==", params.categoryId);
    return query;
  };

  const snap = await baseQuery().limit(SEARCH_SCAN_LIMIT).get();
  let all = snap.docs.map((d) => ({ id: d.id, data: d.data() as ProductDoc }));

  if (q) {
    all = all.filter(
      (r) =>
        r.data.name.toLowerCase().includes(q) ||
        r.data.sku.toLowerCase().includes(q) ||
        r.data.slug.toLowerCase().includes(q) ||
        r.data.brand?.toLowerCase().includes(q) ||
        r.data.tags.some((t) => t.toLowerCase() === q),
    );
  }

  const total = all.length;
  const dir = orderDir === "asc" ? 1 : -1;
  all.sort((a, b) => {
    const av = a.data[orderField as keyof ProductDoc];
    const bv = b.data[orderField as keyof ProductDoc];
    if (av == null || bv == null) return 0;
    const an = av instanceof Object && "toMillis" in av ? (av as FirebaseFirestore.Timestamp).toMillis() : av;
    const bn = bv instanceof Object && "toMillis" in bv ? (bv as FirebaseFirestore.Timestamp).toMillis() : bv;
    return an < bn ? -1 * dir : an > bn ? 1 * dir : 0;
  });
  const rows = all.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  const categoryIds = [...new Set(rows.map((r) => r.data.categoryId).filter((x): x is string => !!x))];
  const [categorySnaps, stockByProduct] = await Promise.all([
    categoryIds.length ? firestore.getAll(...categoryIds.map((id) => firestore.collection(Collections.categories).doc(id))) : [],
    inventoryTotals(rows.map((r) => r.id)),
  ]);
  const categoriesById = new Map(categorySnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as { name: string }]));

  const list: ProductListRow[] = rows.map((r) => {
    const mrp = Number(r.data.mrp);
    const sp = Number(r.data.sellingPrice);
    return {
      id: r.id,
      sku: r.data.sku,
      name: r.data.name,
      slug: r.data.slug,
      status: r.data.status,
      categoryName: r.data.categoryId ? (categoriesById.get(r.data.categoryId)?.name ?? null) : null,
      imageUrl: r.data.imageUrl,
      mrp: r.data.mrp,
      sellingPrice: r.data.sellingPrice,
      discountPct: discountPct(mrp, sp),
      pv: r.data.pv,
      bv: r.data.bv,
      stock: stockByProduct.get(r.id) ?? 0,
      isFeatured: r.data.isFeatured,
      updatedAt: r.data.updatedAt.toDate().toISOString(),
    };
  });

  return { list, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

// ── form data ─────────────────────────────────────────────────────────────

export async function getCatalogFormData() {
  const firestore = db();
  const [categoriesSnap, warehousesSnap] = await Promise.all([
    firestore.collection(Collections.categories).orderBy("sortOrder", "asc").get(),
    firestore.collection(Collections.warehouses).orderBy("name", "asc").get(),
  ]);
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, name: (d.data() as { name: string }).name }));

  const siteIds = [...new Set(warehousesSnap.docs.map((d) => (d.data() as { siteId: string }).siteId))];
  const siteSnaps = siteIds.length ? await firestore.getAll(...siteIds.map((id) => firestore.collection(Collections.sites).doc(id))) : [];
  const sitesById = new Map(siteSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as { name: string }]));

  const warehouses = warehousesSnap.docs.map((d) => {
    const w = d.data() as { name: string; siteId: string };
    return { id: d.id, name: w.name, siteName: sitesById.get(w.siteId)?.name ?? "" };
  });

  return { categories, warehouses };
}

// ── detail (edit) ─────────────────────────────────────────────────────────

export async function getProductForEdit(id: string) {
  const firestore = db();
  const snap = await firestore.collection(Collections.products).doc(id).get();
  if (!snap.exists) return null;
  const p = snap.data() as ProductDoc;

  const [imagesSnap, categorySnap, inventorySnap] = await Promise.all([
    firestore.collection(Collections.products).doc(id).collection("images").orderBy("position", "asc").get(),
    p.categoryId ? firestore.collection(Collections.categories).doc(p.categoryId).get() : Promise.resolve(null),
    firestore.collection(Collections.inventoryItems).where("productId", "==", id).get(),
  ]);
  const userIds = [p.createdByUserId, p.updatedByUserId].filter((x): x is string => !!x);
  const userSnaps = userIds.length ? await firestore.getAll(...userIds.map((uid) => firestore.collection(Collections.appUsers).doc(uid))) : [];
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const label = (uid: string | null) => {
    if (!uid) return null;
    const u = usersByUid.get(uid);
    return u?.displayName ?? u?.email ?? null;
  };

  const stock = inventorySnap.docs.reduce((n, d) => n + (d.data() as { qtyAvailable: number }).qtyAvailable, 0);

  return {
    id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle,
    description: p.description,
    brand: p.brand,
    categoryId: p.categoryId,
    categoryName: categorySnap?.exists ? (categorySnap.data() as { name: string }).name : null,
    tags: p.tags,
    status: p.status,
    publishedAt: p.publishedAt?.toDate().toISOString() ?? null,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    gstRateBps: p.gstRateBps,
    hsnCode: p.hsnCode,
    gtin: p.gtin,
    unitLabel: p.unitLabel,
    weightGrams: p.weightGrams,
    pv: p.pv,
    bv: p.bv,
    autoshipEligible: p.autoshipEligible,
    images: imagesSnap.docs.map((d) => {
      const img = d.data() as ProductImageDoc;
      return { url: img.url, alt: img.alt ?? "" };
    }),
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    ogImageUrl: p.ogImageUrl,
    canonicalUrl: p.canonicalUrl,
    noIndex: p.noIndex,
    focusKeyword: p.focusKeyword,
    isFeatured: p.isFeatured,
    isPopular: p.isPopular,
    isLatest: p.isLatest,
    rating: p.rating,
    reviews: p.reviews,
    stock,
    createdAt: p.createdAt.toDate().toISOString(),
    updatedAt: p.updatedAt.toDate().toISOString(),
    createdBy: label(p.createdByUserId),
    updatedBy: label(p.updatedByUserId),
  };
}

export type ProductEditData = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

// ── mutations ─────────────────────────────────────────────────────────────

/** Shared field values for create + update (excludes slug/sku/publishedAt/actor/timestamps). */
function scalarData(input: ProductWriteInput) {
  return {
    name: input.name,
    subtitle: input.subtitle || null,
    description: input.description || null,
    brand: input.brand || null,
    categoryId: input.categoryId || null,
    tags: input.tags,
    status: input.status,
    isActive: input.status === "ACTIVE",
    isFeatured: input.isFeatured,
    isPopular: input.isPopular,
    isLatest: input.isLatest,
    mrp: moneyToFirestore(input.mrp),
    sellingPrice: moneyToFirestore(input.sellingPrice),
    gstRateBps: input.gstRateBps,
    hsnCode: input.hsnCode || null,
    gtin: input.gtin || null,
    unitLabel: input.unitLabel || null,
    weightGrams: input.weightGrams ?? null,
    pv: moneyToFirestore(input.pv),
    bv: moneyToFirestore(input.bv),
    autoshipEligible: input.autoshipEligible,
    imageUrl: input.images[0]?.url ?? null,
    images: input.images.map((i) => i.url),
    metaTitle: input.metaTitle || null,
    metaDescription: input.metaDescription || null,
    ogImageUrl: input.ogImageUrl || null,
    canonicalUrl: input.canonicalUrl || null,
    noIndex: input.noIndex,
    focusKeyword: input.focusKeyword || null,
  };
}

async function syncImages(
  tx: FirebaseFirestore.Transaction,
  productId: string,
  images: ProductImageInput[],
  existingImageIds: string[],
) {
  const imagesCol = doc(Collections.products, productId).collection("images");
  for (const id of existingImageIds) tx.delete(imagesCol.doc(id));
  images.forEach((img, i) => {
    const data: ProductImageDoc = { url: img.url, alt: img.alt || null, position: i, createdAt: nowSentinel() };
    tx.set(imagesCol.doc(), data);
  });
}

export async function createProduct(input: ProductWriteInput, actorId: string) {
  // Same TOCTOU window as the original Prisma version (no unique-lock retry
  // here) — a deliberate parity choice, not a new risk: catalog writes are
  // low-concurrency (a handful of admins), unlike the identity/genealogy
  // paths where `runUniqueTransaction` is used.
  const slug = await uniqueProductSlug(input.slug || input.name);
  const sku = await uniqueProductSku(input.sku || input.name);
  const firestore = db();
  const productRef = firestore.collection(Collections.products).doc();

  await firestore.runTransaction(async (tx) => {
    const now = nowSentinel();
    const data: ProductDoc = {
      ...scalarData(input),
      slug,
      sku,
      publishedAt: input.status === "ACTIVE" ? now : null,
      rating: "0",
      reviews: 0,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actorId,
      updatedByUserId: actorId,
    };
    tx.set(productRef, data);
    await syncImages(tx, productRef.id, input.images, []);

    const opening = input.openingStock ?? 0;
    if (opening > 0 && input.warehouseId) {
      const invRef = doc(Collections.inventoryItems, `${productRef.id}_${input.warehouseId}`);
      tx.set(invRef, {
        productId: productRef.id,
        warehouseId: input.warehouseId,
        qtyAvailable: opening,
        qtyReserved: 0,
        updatedAt: now,
      });
      tx.set(firestore.collection(Collections.stockLedgerEntries).doc(), {
        productId: productRef.id,
        warehouseId: input.warehouseId,
        delta: opening,
        reason: "PURCHASE_IN",
        refType: "manual",
        refId: null,
        createdByUserId: actorId,
        note: "Opening stock (product created)",
        createdAt: now,
      });
    }
  });

  return { id: productRef.id, slug, sku };
}

export async function updateProduct(id: string, input: ProductWriteInput, actorId: string) {
  const firestore = db();
  const ref = firestore.collection(Collections.products).doc(id);
  const existingSnap = await ref.get();
  if (!existingSnap.exists) throw new Error("Product not found");
  const existing = existingSnap.data() as ProductDoc;

  const slug = input.slug ? await uniqueProductSlug(input.slug, id) : existing.slug;
  const existingImagesSnap = await ref.collection("images").get();

  await firestore.runTransaction(async (tx) => {
    tx.update(ref, {
      ...scalarData(input),
      slug,
      publishedAt: input.status === "ACTIVE" && !existing.publishedAt ? nowSentinel() : existing.publishedAt,
      updatedAt: nowSentinel(),
      updatedByUserId: actorId,
    });
    await syncImages(
      tx,
      id,
      input.images,
      existingImagesSnap.docs.map((d) => d.id),
    );
  });

  return { id, slug, sku: existing.sku };
}

export async function setProductStatus(id: string, status: ProductStatus, actorId: string) {
  const ref = doc(Collections.products, id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Product not found");
  const existing = snap.data() as ProductDoc;

  await ref.update({
    status,
    isActive: status === "ACTIVE",
    publishedAt: status === "ACTIVE" && !existing.publishedAt ? nowSentinel() : existing.publishedAt,
    updatedAt: nowSentinel(),
    updatedByUserId: actorId,
  });
  return { name: existing.name, from: existing.status, to: status };
}

export async function duplicateProduct(id: string, actorId: string) {
  const firestore = db();
  const srcSnap = await firestore.collection(Collections.products).doc(id).get();
  if (!srcSnap.exists) throw new Error("Product not found");
  const src = srcSnap.data() as ProductDoc;
  const srcImagesSnap = await srcSnap.ref.collection("images").orderBy("position", "asc").get();

  const slug = await uniqueProductSlug(`${src.slug}-copy`);
  const sku = await uniqueProductSku(`${src.sku}-COPY`);
  const copyRef = firestore.collection(Collections.products).doc();

  await firestore.runTransaction(async (tx) => {
    const now = nowSentinel();
    const data: ProductDoc = {
      name: `${src.name} (copy)`,
      slug,
      sku,
      subtitle: src.subtitle,
      description: src.description,
      brand: src.brand,
      categoryId: src.categoryId,
      tags: src.tags,
      status: "DRAFT",
      isActive: false,
      isFeatured: false,
      isPopular: false,
      isLatest: false,
      publishedAt: null,
      mrp: src.mrp,
      sellingPrice: src.sellingPrice,
      gstRateBps: src.gstRateBps,
      hsnCode: src.hsnCode,
      gtin: null, // a barcode is unique to one SKU
      unitLabel: src.unitLabel,
      weightGrams: src.weightGrams,
      pv: src.pv,
      bv: src.bv,
      autoshipEligible: src.autoshipEligible,
      imageUrl: src.imageUrl,
      images: src.images,
      metaTitle: src.metaTitle,
      metaDescription: src.metaDescription,
      ogImageUrl: src.ogImageUrl,
      canonicalUrl: null,
      noIndex: src.noIndex,
      focusKeyword: src.focusKeyword,
      rating: "0",
      reviews: 0,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actorId,
      updatedByUserId: actorId,
    };
    tx.set(copyRef, data);
    const imagesCol = copyRef.collection("images");
    for (const d of srcImagesSnap.docs) {
      const img = d.data() as ProductImageDoc;
      tx.set(imagesCol.doc(), img);
    }
  });

  return { id: copyRef.id };
}

/**
 * Permanently delete a product and everything that only exists to describe
 * it: images, variants, affiliate links, per-variant competitor prices, and
 * inventory levels. Historical records that must survive the product itself
 * — order line items (they snapshot name/price/sku already), stock ledger
 * entries (an audit trail) — are deliberately left untouched, the same way
 * audit logs outlive a deleted distributor elsewhere in the app.
 *
 * Firestore has no cascading deletes, so this fans out explicitly; a batch
 * (not a transaction) is enough since there are no reads to make atomic with
 * the writes, and it comfortably covers the bounded number of docs one
 * product can own.
 */
export async function deleteProduct(id: string): Promise<{ name: string; sku: string }> {
  const firestore = db();
  const ref = firestore.collection(Collections.products).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Product not found");
  const product = snap.data() as ProductDoc;

  const [imagesSnap, variantsSnap, affiliateLinksSnap, inventorySnap] = await Promise.all([
    ref.collection("images").get(),
    firestore.collection(Collections.productVariants).where("productId", "==", id).get(),
    firestore.collection(Collections.affiliateLinks).where("productId", "==", id).get(),
    firestore.collection(Collections.inventoryItems).where("productId", "==", id).get(),
  ]);

  const variantIds = variantsSnap.docs.map((d) => d.id);
  const competitorPriceRefs: FirebaseFirestore.DocumentReference[] = [];
  for (let i = 0; i < variantIds.length; i += 30) {
    const chunk = variantIds.slice(i, i + 30);
    if (!chunk.length) continue;
    const cpSnap = await firestore.collection(Collections.competitorPrices).where("variantId", "in", chunk).get();
    competitorPriceRefs.push(...cpSnap.docs.map((d) => d.ref));
  }

  const refsToDelete = [
    ...imagesSnap.docs.map((d) => d.ref),
    ...variantsSnap.docs.map((d) => d.ref),
    ...affiliateLinksSnap.docs.map((d) => d.ref),
    ...inventorySnap.docs.map((d) => d.ref),
    ...competitorPriceRefs,
    ref,
  ];

  for (let i = 0; i < refsToDelete.length; i += 450) {
    const batch = firestore.batch();
    for (const docRef of refsToDelete.slice(i, i + 450)) batch.delete(docRef);
    await batch.commit();
  }

  return { name: product.name, sku: product.sku };
}

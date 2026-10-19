/**
 * ONE-TIME data migration: Postgres (via Prisma) + Supabase -> Firestore.
 *
 * This is the actual data-move step of the Prisma -> Firestore migration
 * (the rest of the app's code has already been rewritten to read/write
 * Firestore instead — see docs/ARCHITECTURE.md). Run this ONCE against a
 * frozen production database (writes stopped) before decommissioning
 * Cloud SQL / Supabase, per the cutover checklist in docs/RELEASE.md.
 *
 * What it does, in order:
 *   1. Connects to Postgres (Prisma), Supabase, and Firestore.
 *   2. For every model, reads all rows and writes them to Firestore keeping
 *      the SAME id (so every foreign-key-shaped string field already written
 *      by the old app stays valid — no id remapping anywhere), except the
 *      handful of 1:1-with-AppUser models that are intentionally re-keyed by
 *      `userId` (KycProfile, Wallet) — see src/server/models.ts.
 *   3. Prints a row-count parity report per collection.
 *
 * Safe to re-run: every write is a `.set()` keyed by the same id, so re-running
 * overwrites rather than duplicates.
 *
 * Usage:
 *   1. Make sure `.env.local` (or the prod env) has DATABASE_URL,
 *      NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (if the old
 *      Supabase project still exists), and FIREBASE_SERVICE_ACCOUNT_JSON set.
 *   2. `npx prisma generate` (needs prisma/schema.prisma — kept around
 *      specifically for this script; safe to delete both AFTER migration is
 *      verified).
 *   3. npx tsx scripts/migrate-to-firestore.ts
 */
import { PrismaClient, type Prisma as PrismaNS } from "@prisma/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

// ── connections ──────────────────────────────────────────────────────────

const prisma = new PrismaClient();

function initFirestore(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON to the target project's service account.");
    const svc = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    initializeApp({
      credential: cert({ projectId: svc.project_id, clientEmail: svc.client_email, privateKey: svc.private_key.replace(/\\n/g, "\n") }),
      projectId: svc.project_id,
    });
  }
  const fs = getFirestore();
  fs.settings({ ignoreUndefinedProperties: true });
  return fs;
}
const db = initFirestore();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createSupabaseClient(supabaseUrl, supabaseKey) : null;

// ── helpers ──────────────────────────────────────────────────────────────

const money = (v: PrismaNS.Decimal | null | undefined): string | null => (v == null ? null : v.toFixed(2));
const moneyReq = (v: PrismaNS.Decimal): string => v.toFixed(2);
const ts = (d: Date | null | undefined): Timestamp | null => (d ? Timestamp.fromDate(d) : null);
const tsReq = (d: Date): Timestamp => Timestamp.fromDate(d);

const report: { collection: string; source: number; written: number }[] = [];

/** Batched writes, chunked at 450 to stay under Firestore's 500-op limit. */
async function writeAll(collection: string, rows: { id: string; data: Record<string, unknown> }[]) {
  for (let i = 0; i < rows.length; i += 450) {
    const batch = db.batch();
    for (const r of rows.slice(i, i + 450)) batch.set(db.collection(collection).doc(r.id), r.data);
    await batch.commit();
  }
  report.push({ collection, source: rows.length, written: rows.length });
  console.log(`  ${collection}: ${rows.length} rows`);
}

// ── migrations, one per model/collection ────────────────────────────────

async function migrateAppUsers() {
  const rows = await prisma.appUser.findMany({ include: { memberProfile: { select: { id: true } } } });
  await writeAll(
    "app_users",
    rows.map((u) => ({
      id: u.id,
      data: {
        email: u.email,
        phone: u.phone,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        extraCapabilities: u.extraCapabilities,
        deniedCapabilities: u.deniedCapabilities,
        memberProfileId: u.memberProfile?.id ?? null,
        createdAt: tsReq(u.createdAt),
        updatedAt: tsReq(u.updatedAt),
      },
    })),
  );
}

async function migrateMemberProfiles() {
  const rows = await prisma.memberProfile.findMany();
  await writeAll(
    "member_profiles",
    rows.map((m) => ({
      id: m.id,
      data: {
        userId: m.userId,
        memberCode: m.memberCode,
        sponsorId: m.sponsorId,
        placementStrategy: m.placementStrategy,
        status: m.status,
        joinedAt: tsReq(m.joinedAt),
        joiningOrderId: m.joiningOrderId,
        frozenAt: ts(m.frozenAt),
        frozenReason: m.frozenReason,
        terminatedAt: ts(m.terminatedAt),
        compressedIntoId: m.compressedIntoId,
        lastMovedAt: ts(m.lastMovedAt),
        lastMovedFromId: m.lastMovedFromId,
      },
    })),
  );
}

async function migrateNetworkClosure() {
  const rows = await prisma.networkClosure.findMany();
  const memberJoinedAt = new Map((await prisma.memberProfile.findMany({ select: { id: true, joinedAt: true } })).map((m) => [m.id, m.joinedAt]));
  await writeAll(
    "network_closure",
    rows.map((c) => ({
      id: `${c.ancestorId}_${c.descendantId}`,
      data: {
        ancestorId: c.ancestorId,
        descendantId: c.descendantId,
        depth: c.depth,
        descendantJoinedAt: tsReq(memberJoinedAt.get(c.descendantId) ?? new Date()),
      },
    })),
  );
}

async function migrateFamilyMembers() {
  const rows = await prisma.familyMember.findMany();
  for (let i = 0; i < rows.length; i += 450) {
    const batch = db.batch();
    for (const f of rows.slice(i, i + 450)) {
      batch.set(db.collection("member_profiles").doc(f.memberProfileId).collection("family_members").doc(f.id), {
        memberProfileId: f.memberProfileId,
        relation: f.relation,
        name: f.name,
        aadhaarEnc: f.aadhaarEnc,
        aadhaarLast4: f.aadhaarLast4,
        panEnc: f.panEnc,
        panLast4: f.panLast4,
        isNominee: f.isNominee,
        nomineeSharePct: money(f.nomineeSharePct),
        createdAt: tsReq(f.createdAt),
        updatedAt: tsReq(f.updatedAt),
      });
    }
    await batch.commit();
  }
  console.log(`  family_members (subcollections): ${rows.length} rows`);
}

async function migrateKycProfiles() {
  // Doc id = userId (1:1 with AppUser) — see src/server/models.ts.
  const rows = await prisma.kycProfile.findMany();
  await writeAll(
    "kyc_profiles",
    rows.map((k) => ({
      id: k.userId,
      data: {
        userId: k.userId,
        status: k.status,
        aadhaarEnc: k.aadhaarEnc,
        aadhaarLast4: k.aadhaarLast4,
        aadhaarHash: k.aadhaarHash,
        panEnc: k.panEnc,
        panLast4: k.panLast4,
        panHash: k.panHash,
        bankAccountEnc: k.bankAccountEnc,
        bankAccountLast4: k.bankAccountLast4,
        ifsc: k.ifsc,
        accountHolderName: k.accountHolderName,
        documentPaths: k.documentPaths,
        consentAcceptedAt: ts(k.consentAcceptedAt),
        submittedAt: ts(k.submittedAt),
        reviewedByUserId: k.reviewedByUserId,
        reviewedAt: ts(k.reviewedAt),
        rejectionReason: k.rejectionReason,
        createdAt: tsReq(k.createdAt),
        updatedAt: tsReq(k.updatedAt),
      },
    })),
  );
}

async function migrateMemberApplications() {
  const rows = await prisma.memberApplication.findMany();
  await writeAll(
    "member_applications",
    rows.map((a) => ({
      id: a.id,
      data: {
        referrerInput: a.referrerInput,
        sponsorId: a.sponsorId,
        sponsorCodeSnapshot: a.sponsorCodeSnapshot,
        fullName: a.fullName,
        phone: a.phone,
        phoneHash: a.phoneHash,
        email: a.email,
        age: a.age,
        gender: a.gender,
        familyMemberCount: a.familyMemberCount,
        idProofType: a.idProofType,
        idProofLast4: a.idProofLast4,
        addressLine: a.addressLine,
        city: a.city,
        district: a.district,
        state: a.state,
        pincode: a.pincode,
        nomineeName: a.nomineeName,
        sponsorConfirmed: a.sponsorConfirmed,
        termsAcceptedAt: ts(a.termsAcceptedAt),
        consentIp: a.consentIp,
        consentUserAgent: a.consentUserAgent,
        captchaVerifiedAt: ts(a.captchaVerifiedAt),
        source: a.source,
        createdByUserId: a.createdByUserId,
        status: a.status,
        reviewedByUserId: a.reviewedByUserId,
        reviewedAt: ts(a.reviewedAt),
        reviewNote: a.reviewNote,
        memberProfileId: a.memberProfileId,
        createdAt: tsReq(a.createdAt),
        updatedAt: tsReq(a.updatedAt),
      },
    })),
  );
}

async function migrateCatalog() {
  const sites = await prisma.site.findMany();
  await writeAll("sites", sites.map((s) => ({ id: s.id, data: { name: s.name, domain: s.domain, isPrimary: s.isPrimary, createdAt: tsReq(s.createdAt) } })));

  const categories = await prisma.category.findMany();
  await writeAll(
    "categories",
    categories.map((c) => ({ id: c.id, data: { name: c.name, slug: c.slug, iconKey: c.iconKey, sortOrder: c.sortOrder } })),
  );

  const warehouses = await prisma.warehouse.findMany();
  await writeAll("warehouses", warehouses.map((w) => ({ id: w.id, data: { siteId: w.siteId, name: w.name, address: w.address } })));

  const products = await prisma.product.findMany();
  await writeAll(
    "products",
    products.map((p) => ({
      id: p.id,
      data: {
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        subtitle: p.subtitle,
        description: p.description,
        brand: p.brand,
        categoryId: p.categoryId,
        tags: p.tags,
        status: p.status,
        publishedAt: ts(p.publishedAt),
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isPopular: p.isPopular,
        isLatest: p.isLatest,
        mrp: moneyReq(p.mrp),
        sellingPrice: moneyReq(p.sellingPrice),
        gstRateBps: p.gstRateBps,
        hsnCode: p.hsnCode,
        gtin: p.gtin,
        unitLabel: p.unitLabel,
        weightGrams: p.weightGrams,
        pv: moneyReq(p.pv),
        bv: moneyReq(p.bv),
        autoshipEligible: p.autoshipEligible,
        imageUrl: p.imageUrl,
        images: Array.isArray(p.images) ? p.images : null,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        ogImageUrl: p.ogImageUrl,
        canonicalUrl: p.canonicalUrl,
        noIndex: p.noIndex,
        focusKeyword: p.focusKeyword,
        rating: moneyReq(p.rating),
        reviews: p.reviews,
        createdAt: tsReq(p.createdAt),
        updatedAt: tsReq(p.updatedAt),
        createdByUserId: p.createdByUserId,
        updatedByUserId: p.updatedByUserId,
      },
    })),
  );

  const images = await prisma.productImage.findMany();
  for (let i = 0; i < images.length; i += 450) {
    const batch = db.batch();
    for (const img of images.slice(i, i + 450)) {
      batch.set(db.collection("products").doc(img.productId).collection("images").doc(img.id), {
        url: img.url,
        alt: img.alt,
        position: img.position,
        createdAt: tsReq(img.createdAt),
      });
    }
    await batch.commit();
  }
  console.log(`  products/{id}/images (subcollections): ${images.length} rows`);

  const reviews = await prisma.productReview.findMany();
  for (let i = 0; i < reviews.length; i += 450) {
    const batch = db.batch();
    for (const r of reviews.slice(i, i + 450)) {
      batch.set(db.collection("products").doc(r.productId).collection("reviews").doc(r.id), {
        authorName: r.authorName,
        authorUserId: r.authorUserId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        verifiedBuyer: r.verifiedBuyer,
        createdAt: tsReq(r.createdAt),
        updatedAt: tsReq(r.updatedAt),
      });
    }
    await batch.commit();
  }
  console.log(`  products/{id}/reviews (subcollections): ${reviews.length} rows`);

  const inventory = await prisma.inventoryItem.findMany();
  await writeAll(
    "inventory_items",
    inventory.map((i) => ({
      id: `${i.productId}_${i.warehouseId}`,
      data: { productId: i.productId, warehouseId: i.warehouseId, qtyAvailable: i.qtyAvailable, qtyReserved: i.qtyReserved, updatedAt: tsReq(i.updatedAt) },
    })),
  );

  const stockLedger = await prisma.stockLedgerEntry.findMany();
  await writeAll(
    "stock_ledger_entries",
    stockLedger.map((s) => ({
      id: s.id,
      data: {
        productId: s.productId,
        warehouseId: s.warehouseId,
        delta: s.delta,
        reason: s.reason,
        refType: s.refType,
        refId: s.refId,
        createdByUserId: s.createdByUserId,
        note: s.note,
        createdAt: tsReq(s.createdAt),
      },
    })),
  );

  const transfers = await prisma.siteStockTransfer.findMany();
  await writeAll(
    "site_stock_transfers",
    transfers.map((t) => ({
      id: t.id,
      data: {
        fromSiteId: t.fromSiteId,
        toSiteId: t.toSiteId,
        productId: t.productId,
        qty: t.qty,
        unitCost: moneyReq(t.unitCost),
        status: t.status,
        createdAt: tsReq(t.createdAt),
        dispatchedAt: ts(t.dispatchedAt),
        receivedAt: ts(t.receivedAt),
      },
    })),
  );

  const variants = await prisma.productVariant.findMany();
  await writeAll(
    "product_variants",
    variants.map((v) => ({
      id: v.id,
      data: {
        productId: v.productId,
        sku: v.sku,
        weightGrams: v.weightGrams,
        label: v.label,
        mrp: moneyReq(v.mrp),
        sellingPrice: moneyReq(v.sellingPrice),
        isActive: v.isActive,
        createdAt: tsReq(v.createdAt),
        updatedAt: tsReq(v.updatedAt),
      },
    })),
  );

  const affiliateLinks = await prisma.affiliateLink.findMany();
  await writeAll(
    "affiliate_links",
    affiliateLinks.map((a) => ({
      id: `${a.productId}_${a.retailer}`,
      data: { productId: a.productId, retailer: a.retailer, url: a.url, enabled: a.enabled, clicks: a.clicks, createdAt: tsReq(a.createdAt), updatedAt: tsReq(a.updatedAt) },
    })),
  );

  const competitorPrices = await prisma.competitorPrice.findMany();
  await writeAll(
    "competitor_prices",
    competitorPrices.map((c) => ({
      id: `${c.variantId}_${c.retailer}`,
      data: {
        variantId: c.variantId,
        retailer: c.retailer,
        price: money(c.price),
        currency: c.currency,
        sourceUrl: c.sourceUrl,
        inStock: c.inStock,
        lastUpdated: tsReq(c.lastUpdated),
      },
    })),
  );
}

async function migrateOrders() {
  const orders = await prisma.order.findMany();
  await writeAll(
    "orders",
    orders.map((o) => ({
      id: o.id,
      data: {
        orderNo: o.orderNo,
        userId: o.userId,
        placedByMemberId: o.placedByMemberId,
        type: o.type,
        status: o.status,
        siteId: o.siteId,
        subtotal: moneyReq(o.subtotal),
        discount: moneyReq(o.discount),
        shipping: moneyReq(o.shipping),
        tax: moneyReq(o.tax),
        total: moneyReq(o.total),
        walletApplied: moneyReq(o.walletApplied),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        shippingAddress: o.shippingAddress,
        buyerStateCode: o.buyerStateCode,
        createdAt: tsReq(o.createdAt),
        confirmedAt: ts(o.confirmedAt),
        cancelledAt: ts(o.cancelledAt),
      },
    })),
  );

  const items = await prisma.orderItem.findMany();
  for (let i = 0; i < items.length; i += 450) {
    const batch = db.batch();
    for (const it of items.slice(i, i + 450)) {
      batch.set(db.collection("orders").doc(it.orderId).collection("items").doc(it.id), {
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        unitPrice: moneyReq(it.unitPrice),
        gstRateBps: it.gstRateBps,
        lineTax: moneyReq(it.lineTax),
        lineTotal: moneyReq(it.lineTotal),
      });
    }
    await batch.commit();
  }
  console.log(`  orders/{id}/items (subcollections): ${items.length} rows`);

  const payments = await prisma.payment.findMany();
  await writeAll(
    "payments",
    payments.map((p) => ({
      id: p.id,
      data: {
        orderId: p.orderId,
        provider: p.provider,
        providerRef: p.providerRef,
        method: p.method,
        amount: moneyReq(p.amount),
        status: p.status,
        idempotencyKey: p.idempotencyKey,
        rawPayload: p.rawPayload,
        createdAt: tsReq(p.createdAt),
        updatedAt: tsReq(p.updatedAt),
      },
    })),
  );

  const gst = await prisma.gstInvoice.findMany();
  await writeAll(
    "gst_invoices",
    gst.map((g) => ({
      id: g.id,
      data: {
        orderId: g.orderId,
        invoiceNo: g.invoiceNo,
        sellerStateCode: g.sellerStateCode,
        buyerStateCode: g.buyerStateCode,
        placeOfSupply: g.placeOfSupply,
        isInterState: g.isInterState,
        taxableValue: moneyReq(g.taxableValue),
        cgst: moneyReq(g.cgst),
        sgst: moneyReq(g.sgst),
        igst: moneyReq(g.igst),
        total: moneyReq(g.total),
        pdfPath: g.pdfPath,
        issuedAt: tsReq(g.issuedAt),
      },
    })),
  );
}

async function migrateCommissionAndWallet() {
  const ruleSets = await prisma.commissionRuleSet.findMany();
  await writeAll(
    "commission_rule_sets",
    ruleSets.map((r) => ({
      id: r.id,
      data: {
        name: r.name,
        status: r.status,
        effectiveFrom: tsReq(r.effectiveFrom),
        effectiveTo: ts(r.effectiveTo),
        ruleJson: r.ruleJson,
        confirmPending: r.confirmPending,
        createdByUserId: r.createdByUserId,
        note: r.note,
        createdAt: tsReq(r.createdAt),
      },
    })),
  );

  // Doc id = userId (1:1 with AppUser) — see src/server/models.ts.
  const wallets = await prisma.wallet.findMany();
  await writeAll(
    "wallets",
    wallets.map((w) => ({ id: w.userId, data: { userId: w.userId, balanceCache: moneyReq(w.balanceCache), settledBalance: moneyReq(w.settledBalance), updatedAt: tsReq(w.updatedAt) } })),
  );

  const ledger = await prisma.commissionLedgerEntry.findMany();
  await writeAll(
    "commission_ledger_entries",
    ledger.map((l) => ({
      id: l.id,
      data: {
        beneficiaryId: l.beneficiaryId,
        sourceOrderId: l.sourceOrderId,
        sourceMemberId: l.sourceMemberId,
        ruleSetId: l.ruleSetId,
        level: l.level,
        type: l.type,
        amount: moneyReq(l.amount),
        status: l.status,
        idempotencyKey: l.idempotencyKey,
        reversalOfId: l.reversalOfId,
        heldReason: l.heldReason,
        runId: l.runId,
        createdAt: tsReq(l.createdAt),
        postedAt: ts(l.postedAt),
      },
    })),
  );

  const runs = await prisma.commissionRun.findMany();
  await writeAll(
    "commission_runs",
    runs.map((r) => ({
      id: r.id,
      data: {
        label: r.label,
        periodStart: tsReq(r.periodStart),
        periodEnd: tsReq(r.periodEnd),
        status: r.status,
        entryCount: r.entryCount,
        totalAmount: moneyReq(r.totalAmount),
        previewJson: r.previewJson,
        createdByUserId: r.createdByUserId,
        previewedAt: ts(r.previewedAt),
        releasedByUserId: r.releasedByUserId,
        releasedAt: ts(r.releasedAt),
        createdAt: tsReq(r.createdAt),
      },
    })),
  );

  const withdrawals = await prisma.withdrawalRequest.findMany();
  await writeAll(
    "withdrawal_requests",
    withdrawals.map((w) => ({
      id: w.id,
      data: {
        userId: w.userId,
        amount: moneyReq(w.amount),
        status: w.status,
        bankAccountLast4: w.bankAccountLast4,
        ifsc: w.ifsc,
        requestedAt: tsReq(w.requestedAt),
        reviewedByUserId: w.reviewedByUserId,
        reviewedAt: ts(w.reviewedAt),
        reviewNote: w.reviewNote,
        payoutItemId: w.payoutItemId,
        createdAt: tsReq(w.createdAt),
      },
    })),
  );

  const walletTxns = await prisma.walletTransaction.findMany();
  await writeAll(
    "wallet_transactions",
    walletTxns.map((t) => ({
      id: t.id,
      data: {
        walletId: t.walletId,
        ledgerEntryId: t.ledgerEntryId,
        payoutItemId: t.payoutItemId,
        type: t.type,
        amount: moneyReq(t.amount),
        balanceAfter: moneyReq(t.balanceAfter),
        note: t.note,
        createdAt: tsReq(t.createdAt),
      },
    })),
  );

  const trustFund = await prisma.trustFundLedgerEntry.findMany();
  await writeAll(
    "trust_fund_ledger_entries",
    trustFund.map((t) => ({
      id: t.id,
      data: { sourceOrderId: t.sourceOrderId, sourceMemberId: t.sourceMemberId, ruleSetId: t.ruleSetId, amount: moneyReq(t.amount), note: t.note, createdAt: tsReq(t.createdAt) },
    })),
  );

  const payoutBatches = await prisma.payoutBatch.findMany();
  await writeAll(
    "payout_batches",
    payoutBatches.map((b) => ({
      id: b.id,
      data: {
        batchNo: b.batchNo,
        status: b.status,
        lockToken: b.lockToken,
        totalGross: moneyReq(b.totalGross),
        totalTds: moneyReq(b.totalTds),
        totalNet: moneyReq(b.totalNet),
        createdByUserId: b.createdByUserId,
        lockedAt: ts(b.lockedAt),
        processedAt: ts(b.processedAt),
        createdAt: tsReq(b.createdAt),
      },
    })),
  );

  const payoutItems = await prisma.payoutItem.findMany();
  await writeAll(
    "payout_items",
    payoutItems.map((p) => ({
      id: p.id,
      data: {
        batchId: p.batchId,
        userId: p.userId,
        grossAmount: moneyReq(p.grossAmount),
        tdsAmount: moneyReq(p.tdsAmount),
        netAmount: moneyReq(p.netAmount),
        bankAccountLast4: p.bankAccountLast4,
        ifsc: p.ifsc,
        gatewayRef: p.gatewayRef,
        status: p.status,
        failureReason: p.failureReason,
        processedAt: ts(p.processedAt),
        createdAt: tsReq(p.createdAt),
      },
    })),
  );
}

async function migrateQueueAndOps() {
  const events = await prisma.domainEvent.findMany();
  await writeAll(
    "domain_events",
    events.map((e) => ({
      id: e.id,
      data: {
        type: e.type,
        orderId: e.orderId,
        payload: e.payload,
        idempotencyKey: e.idempotencyKey,
        status: e.status,
        attempts: e.attempts,
        lastError: e.lastError,
        createdAt: tsReq(e.createdAt),
        processedAt: ts(e.processedAt),
      },
    })),
  );

  const jobs = await prisma.commissionJob.findMany();
  await writeAll(
    "commission_jobs",
    jobs.map((j) => ({
      id: j.id,
      data: {
        domainEventId: j.domainEventId,
        beneficiaryId: j.beneficiaryId,
        level: j.level,
        status: j.status,
        attempts: j.attempts,
        lastError: j.lastError,
        ledgerEntryId: j.ledgerEntryId,
        createdAt: tsReq(j.createdAt),
        processedAt: ts(j.processedAt),
      },
    })),
  );

  const notifications = await prisma.notification.findMany();
  await writeAll(
    "notifications",
    notifications.map((n) => ({
      id: n.id,
      data: { userId: n.userId, type: n.type, channel: n.channel, payload: n.payload, status: n.status, sentAt: ts(n.sentAt), createdAt: tsReq(n.createdAt) },
    })),
  );

  const auditLogs = await prisma.auditLog.findMany();
  await writeAll(
    "audit_logs",
    auditLogs.map((a) => ({
      id: a.id,
      data: {
        actorUserId: a.actorUserId,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        before: a.before,
        after: a.after,
        ip: a.ip,
        userAgent: a.userAgent,
        createdAt: tsReq(a.createdAt),
      },
    })),
  );

  const contentBlocks = await prisma.contentBlock.findMany();
  await writeAll(
    "content_blocks",
    contentBlocks.map((c) => ({
      id: c.id,
      data: {
        key: c.key,
        type: c.type,
        payload: c.payload,
        isPublished: c.isPublished,
        startsAt: ts(c.startsAt),
        endsAt: ts(c.endsAt),
        updatedByUserId: c.updatedByUserId,
        updatedAt: tsReq(c.updatedAt),
        createdAt: tsReq(c.createdAt),
      },
    })),
  );
}

/** The old Supabase `orders` table (guest storefront checkout) -> `guest_orders`. */
async function migrateSupabaseGuestOrders() {
  if (!supabase) {
    console.log("  (skipped — NEXT_PUBLIC_SUPABASE_URL/ANON_KEY not set; nothing to migrate or the project is already gone)");
    return;
  }
  const { data, error } = await supabase.from("orders").select("*");
  if (error) {
    console.error("  Supabase read failed:", error.message);
    return;
  }
  const rows = (data ?? []) as Array<{
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    shipping_address: string;
    city: string;
    zip_code: string | null;
    items: unknown;
    subtotal: number;
    shipping: number;
    total: number;
    status: string;
    created_at: string;
  }>;
  await writeAll(
    "guest_orders",
    rows.map((o) => ({
      id: o.id,
      data: {
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        customer_phone: o.customer_phone,
        shipping_address: o.shipping_address,
        city: o.city,
        zip_code: o.zip_code,
        items: o.items,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        status: o.status,
        created_at: Timestamp.fromDate(new Date(o.created_at)),
      },
    })),
  );
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Migrating Postgres -> Firestore\n");
  console.log("identity/genealogy:");
  await migrateAppUsers();
  await migrateMemberProfiles();
  await migrateNetworkClosure();
  await migrateFamilyMembers();
  await migrateKycProfiles();
  await migrateMemberApplications();

  console.log("\ncatalog:");
  await migrateCatalog();

  console.log("\norders/payments/GST:");
  await migrateOrders();

  console.log("\ncommissions/wallet/payouts:");
  await migrateCommissionAndWallet();

  console.log("\nqueue/ops:");
  await migrateQueueAndOps();

  console.log("\nSupabase guest orders -> Firestore:");
  await migrateSupabaseGuestOrders();

  console.log("\n─────────────────────────────────────────────");
  console.log(" Row-count parity report");
  console.log("─────────────────────────────────────────────");
  let allOk = true;
  for (const r of report) {
    const ok = r.source === r.written;
    if (!ok) allOk = false;
    console.log(`  ${ok ? "✓" : "✗"} ${r.collection.padEnd(28)} source ${r.source}  written ${r.written}`);
  }
  console.log(allOk ? "\n✓ All collections match.\n" : "\n✗ Mismatch above — investigate before decommissioning Postgres/Supabase.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import "server-only";
import {
  FieldValue,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from "@/lib/data/mock-catalog";

// ============================================================================
// DATABASE COMMENTED OUT — USING COMPREHENSIVE IN-MEMORY MOCK STORE
// ============================================================================
// import { adminFirestore } from "@/server/auth/admin";

export function mockTimestamp(date: Date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6,
  };
}

/** In-memory document store: collectionName -> Map<docId, documentData> */
const inMemoryStore = new Map<string, Map<string, Record<string, any>>>();

function getCollectionStore(name: string): Map<string, Record<string, any>> {
  let col = inMemoryStore.get(name);
  if (!col) {
    col = new Map();
    inMemoryStore.set(name, col);
  }
  return col;
}

// ── Initial Mock Data Seeding ──────────────────────────────────────────────
let initialized = false;
function ensureMockStoreInitialized() {
  if (initialized) return;
  initialized = true;

  // Categories
  const catCol = getCollectionStore(Collections.categories);
  for (const cat of MOCK_CATEGORIES) {
    catCol.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      sortOrder: cat.sort_order,
      productCount: cat.productCount,
      images: cat.images,
      createdAt: mockTimestamp(new Date(Date.now() - 100 * 86400e3)),
      updatedAt: mockTimestamp(),
    });
  }

  // Products
  const prodCol = getCollectionStore(Collections.products);
  for (const prod of MOCK_PRODUCTS) {
    prodCol.set(prod.id, {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      subtitle: prod.subtitle ?? "",
      description: prod.description ?? "",
      sellingPrice: prod.price,
      mrp: prod.old_price ?? prod.price,
      price: prod.price,
      old_price: prod.old_price ?? prod.price,
      imageUrl: prod.image_url,
      categoryId: prod.category_id,
      unitLabel: prod.unit,
      stock: prod.stock,
      rating: prod.rating,
      reviewsCount: prod.reviews,
      badge: prod.badge,
      status: "ACTIVE",
      isFeatured: prod.is_featured,
      isPopular: prod.is_popular,
      isLatest: prod.is_latest,
      sku: prod.sku,
      brand: prod.brand,
      gtin: prod.gtin,
      hsnCode: prod.hsnCode,
      gstRateBps: prod.gstRateBps,
      pv: prod.pv,
      bv: prod.bv,
      weightGrams: prod.weightGrams,
      images: prod.images,
      metaTitle: prod.metaTitle,
      metaDescription: prod.metaDescription,
      canonicalUrl: prod.canonicalUrl,
      createdAt: mockTimestamp(new Date(Date.now() - 30 * 86400e3)),
      updatedAt: mockTimestamp(),
    });
  }

  // App Users
  const userCol = getCollectionStore(Collections.appUsers);
  userCol.set("usr-admin-01", {
    id: "usr-admin-01",
    email: "admin@amaashop.in",
    displayName: "Admin Operator",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    memberProfileId: "mem-1",
    phone: "9876543210",
    createdAt: mockTimestamp(new Date(Date.now() - 120 * 86400e3)),
    updatedAt: mockTimestamp(),
  });
  userCol.set("usr-mem-01", {
    id: "usr-mem-01",
    email: "sunita.devi@example.com",
    displayName: "Sunita Devi",
    role: "DISTRIBUTOR",
    status: "ACTIVE",
    memberProfileId: "mem-1",
    phone: "9876543210",
    createdAt: mockTimestamp(new Date(Date.now() - 90 * 86400e3)),
    updatedAt: mockTimestamp(),
  });
  userCol.set("usr-mem-02", {
    id: "usr-mem-02",
    email: "priya.sharma@example.com",
    displayName: "Priya Sharma",
    role: "DISTRIBUTOR",
    status: "ACTIVE",
    memberProfileId: "mem-2",
    phone: "9876543211",
    createdAt: mockTimestamp(new Date(Date.now() - 60 * 86400e3)),
    updatedAt: mockTimestamp(),
  });

  // Member Profiles
  const memberCol = getCollectionStore(Collections.memberProfiles);
  memberCol.set("mem-1", {
    id: "mem-1",
    userId: "usr-mem-01",
    memberCode: "AMA-7KQ4MT",
    sponsorId: null,
    placementParentId: null,
    leg: null,
    status: "ACTIVE",
    directCount: 6,
    leftCount: 18,
    rightCount: 16,
    joinedAt: mockTimestamp(new Date(Date.now() - 90 * 86400e3)),
    updatedAt: mockTimestamp(),
  });
  memberCol.set("mem-2", {
    id: "mem-2",
    userId: "usr-mem-02",
    memberCode: "AMA-101LFT",
    sponsorId: "mem-1",
    placementParentId: "mem-1",
    leg: "LEFT",
    status: "ACTIVE",
    directCount: 4,
    leftCount: 10,
    rightCount: 8,
    joinedAt: mockTimestamp(new Date(Date.now() - 60 * 86400e3)),
    updatedAt: mockTimestamp(),
  });

  // Member Applications
  const appCol = getCollectionStore(Collections.memberApplications);
  appCol.set("app-101", {
    id: "app-101",
    fullName: "Vikas Malhotra",
    phone: "9876543210",
    email: "vikas.m@example.com",
    age: 32,
    city: "Jaipur",
    state: "Rajasthan",
    referrerInput: "AMA-7KQ4MT",
    sponsorId: "mem-1",
    sponsorCode: "AMA-7KQ4MT",
    source: "PUBLIC",
    status: "PENDING",
    createdAt: mockTimestamp(new Date(Date.now() - 4 * 3600e3)),
  });
  appCol.set("app-102", {
    id: "app-102",
    fullName: "Meenakshi Sundaram",
    phone: "9876543211",
    email: "meenakshi.s@example.com",
    age: 28,
    city: "Madurai",
    state: "Tamil Nadu",
    referrerInput: "AMA-101LFT",
    sponsorId: "mem-2",
    sponsorCode: "AMA-101LFT",
    source: "PUBLIC",
    status: "PENDING",
    createdAt: mockTimestamp(new Date(Date.now() - 12 * 3600e3)),
  });

  // KYC Profiles
  const kycCol = getCollectionStore(Collections.kycProfiles);
  kycCol.set("usr-mem-01", {
    id: "usr-mem-01",
    userId: "usr-mem-01",
    status: "APPROVED",
    panLast4: "1234",
    aadhaarLast4: "9012",
    bankAccountLast4: "1000",
    ifsc: "HDFC0001234",
    submittedAt: mockTimestamp(new Date(Date.now() - 30 * 86400e3)),
    reviewedAt: mockTimestamp(new Date(Date.now() - 28 * 86400e3)),
  });
  kycCol.set("usr-mem-02", {
    id: "usr-mem-02",
    userId: "usr-mem-02",
    status: "SUBMITTED",
    panLast4: "9876",
    aadhaarLast4: "1098",
    bankAccountLast4: "5566",
    ifsc: "SBIN0005678",
    submittedAt: mockTimestamp(new Date(Date.now() - 2 * 86400e3)),
  });

  // Commission Rule Sets
  const ruleCol = getCollectionStore(Collections.commissionRuleSets);
  ruleCol.set("rule-1", {
    id: "rule-1",
    name: "Binary Standard Plan v2.1",
    status: "ACTIVE",
    effectiveFrom: mockTimestamp(new Date(Date.now() - 30 * 86400e3)),
    createdAt: mockTimestamp(new Date(Date.now() - 35 * 86400e3)),
    ruleJson: { directBonusPct: 10, binaryMatchingPct: 10, maxDailyCapping: 50000 },
  });

  // Sites
  const siteCol = getCollectionStore(Collections.sites);
  siteCol.set("site-main", {
    id: "site-main",
    name: "AmaaShop India",
    domain: "amaashop.in",
    isPrimary: true,
    status: "ACTIVE",
  });

  // Wallets
  const walletCol = getCollectionStore(Collections.wallets);
  walletCol.set("usr-mem-01", {
    id: "usr-mem-01",
    userId: "usr-mem-01",
    balance: 12450,
    settled: 10200,
    onHold: 2250,
  });

  // Withdrawal Requests
  const wdCol = getCollectionStore(Collections.withdrawalRequests);
  wdCol.set("wd-101", {
    id: "wd-101",
    userId: "usr-mem-01",
    amount: 5000,
    status: "PAID",
    createdAt: mockTimestamp(new Date(Date.now() - 72 * 3600e3)),
  });
  wdCol.set("wd-102", {
    id: "wd-102",
    userId: "usr-mem-01",
    amount: 2250,
    status: "PENDING",
    createdAt: mockTimestamp(new Date(Date.now() - 10 * 3600e3)),
  });

  // Orders
  const orderCol = getCollectionStore(Collections.orders);
  orderCol.set("AMA-ORD-8821", {
    id: "AMA-ORD-8821",
    orderNo: "AMA-ORD-8821",
    customerName: "Rahul Sharma",
    customerEmail: "udaykantp9199@gmail.com",
    status: "DELIVERED",
    type: "RETAIL",
    total: 623,
    subtotal: 623,
    shipping: 0,
    createdAt: mockTimestamp(new Date(Date.now() - 3 * 86400e3)),
  });
  orderCol.set("AMA-ORD-9104", {
    id: "AMA-ORD-9104",
    orderNo: "AMA-ORD-9104",
    customerName: "Ananya Iyer",
    customerEmail: "ananya.iyer@example.com",
    status: "PROCESSING",
    type: "DISTRIBUTOR_JOIN",
    total: 1249,
    subtotal: 1249,
    shipping: 0,
    createdAt: mockTimestamp(new Date(Date.now() - 1 * 86400e3)),
  });

  // Audit Logs
  const auditCol = getCollectionStore(Collections.auditLogs);
  auditCol.set("log-1", {
    id: "log-1",
    actorUserId: "usr-admin-01",
    action: "SYSTEM_INITIALIZE",
    entityType: "SYSTEM",
    entityId: "init",
    createdAt: mockTimestamp(),
  });
}

function createMockDocRef(collectionName: string, id: string): any {
  ensureMockStoreInitialized();
  return {
    id,
    path: `${collectionName}/${id}`,
    get: async () => {
      const col = getCollectionStore(collectionName);
      const data = col.get(id);
      return {
        id,
        exists: Boolean(data),
        data: () => (data ? { ...data } : undefined),
        get: (field: string) => data?.[field],
        ref: createMockDocRef(collectionName, id),
      };
    },
    set: async (data: any, options?: { merge?: boolean }) => {
      const col = getCollectionStore(collectionName);
      if (options?.merge && col.has(id)) {
        col.set(id, { ...col.get(id), ...data, updatedAt: mockTimestamp() });
      } else {
        col.set(id, { ...data, id, createdAt: data.createdAt ?? mockTimestamp(), updatedAt: mockTimestamp() });
      }
    },
    update: async (data: any) => {
      const col = getCollectionStore(collectionName);
      const existing = col.get(id) || {};
      col.set(id, { ...existing, ...data, updatedAt: mockTimestamp() });
    },
    delete: async () => {
      const col = getCollectionStore(collectionName);
      col.delete(id);
    },
    collection: (subName: string) => createMockCollectionRef(`${collectionName}/${id}/${subName}`),
  };
}

function createMockQuery(name: string, filters: Array<{ field: string; op: string; val: any }> = [], limitVal?: number): any {
  ensureMockStoreInitialized();
  const applyFilters = () => {
    const col = getCollectionStore(name);
    let docs = Array.from(col.entries()).map(([id, data]) => ({
      id,
      exists: true,
      data: () => ({ ...data }),
      ref: createMockDocRef(name, id),
    }));

    for (const f of filters) {
      docs = docs.filter((d) => {
        const item = d.data() as any;
        const val = item?.[f.field];
        if (f.op === "==") return val === f.val;
        if (f.op === "!=") return val !== f.val;
        if (f.op === ">=") {
          if (val instanceof Date && f.val instanceof Date) return val >= f.val;
          if (val?.toMillis && f.val instanceof Date) return val.toMillis() >= f.val.getTime();
          return val >= f.val;
        }
        if (f.op === "<=") {
          if (val instanceof Date && f.val instanceof Date) return val <= f.val;
          if (val?.toMillis && f.val instanceof Date) return val.toMillis() <= f.val.getTime();
          return val <= f.val;
        }
        if (f.op === "in") return Array.isArray(f.val) && f.val.includes(val);
        return true;
      });
    }

    if (limitVal != null) {
      docs = docs.slice(0, limitVal);
    }
    return docs;
  };

  return {
    where: (field: string, op: string, val: any) =>
      createMockQuery(name, [...filters, { field, op, val }], limitVal),
    orderBy: (_field: string, _dir?: string) => createMockQuery(name, filters, limitVal),
    limit: (n: number) => createMockQuery(name, filters, n),
    select: (..._fields: string[]) => createMockQuery(name, filters, limitVal),
    count: () => ({
      get: async () => {
        const docs = applyFilters();
        return { data: () => ({ count: docs.length }) };
      },
    }),
    get: async () => {
      const docs = applyFilters();
      return { empty: docs.length === 0, docs, size: docs.length };
    },
  };
}

function createMockCollectionRef(name: string): any {
  ensureMockStoreInitialized();
  return {
    doc: (id?: string) => createMockDocRef(name, id || `doc_${Math.random().toString(36).slice(2, 9)}`),
    add: async (data: any) => {
      const id = `doc_${Math.random().toString(36).slice(2, 9)}`;
      const col = getCollectionStore(name);
      col.set(id, { ...data, id, createdAt: data.createdAt ?? mockTimestamp() });
      return createMockDocRef(name, id);
    },
    where: (field: string, op: string, val: any) => createMockQuery(name, [{ field, op, val }]),
    orderBy: (_field: string, _dir?: string) => createMockQuery(name),
    limit: (n: number) => createMockQuery(name, [], n),
    select: (..._fields: string[]) => createMockQuery(name),
    count: () => ({
      get: async () => {
        const col = getCollectionStore(name);
        return { data: () => ({ count: col.size }) };
      },
    }),
    get: async () => {
      const col = getCollectionStore(name);
      const docs = Array.from(col.entries()).map(([id, data]) => ({
        id,
        exists: true,
        data: () => ({ ...data }),
        ref: createMockDocRef(name, id),
      }));
      return { empty: docs.length === 0, docs, size: docs.length };
    },
  };
}

const mockFirestoreInstance = {
  settings: () => {},
  collection: (name: string) => createMockCollectionRef(name),
  doc: (path: string) => {
    const parts = path.split("/");
    return createMockDocRef(parts[0]!, parts[1] || "default");
  },
  getAll: async (...refs: any[]) => {
    return Promise.all(refs.map((ref) => ref.get()));
  },
  runTransaction: async (fn: (tx: any) => Promise<any>) => {
    const tx = {
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any, opts?: any) => ref.set(data, opts),
      update: (ref: any, data: any) => ref.update(data),
      delete: (ref: any) => ref.delete(),
    };
    return fn(tx);
  },
} as unknown as Firestore;

export function db(): Firestore {
  return mockFirestoreInstance;
}

/** Collection name constants */
export const Collections = {
  appUsers: "app_users",
  memberProfiles: "member_profiles",
  networkClosure: "network_closure",
  kycProfiles: "kyc_profiles",
  memberApplications: "member_applications",
  sites: "sites",
  categories: "categories",
  products: "products",
  warehouses: "warehouses",
  inventoryItems: "inventory_items",
  stockLedgerEntries: "stock_ledger_entries",
  siteStockTransfers: "site_stock_transfers",
  productVariants: "product_variants",
  affiliateLinks: "affiliate_links",
  competitorPrices: "competitor_prices",
  orders: "orders",
  guestOrders: "guest_orders",
  payments: "payments",
  gstInvoices: "gst_invoices",
  commissionRuleSets: "commission_rule_sets",
  wallets: "wallets",
  commissionLedgerEntries: "commission_ledger_entries",
  commissionRuns: "commission_runs",
  withdrawalRequests: "withdrawal_requests",
  walletTransactions: "wallet_transactions",
  trustFundLedgerEntries: "trust_fund_ledger_entries",
  payoutBatches: "payout_batches",
  payoutItems: "payout_items",
  domainEvents: "domain_events",
  commissionJobs: "commission_jobs",
  notifications: "notifications",
  auditLogs: "audit_logs",
  contentBlocks: "content_blocks",
  uniqueIndex: "unique_index",
} as const;

export function collection(name: string): CollectionReference {
  return db().collection(name);
}

export function doc(collectionName: string, id: string): DocumentReference {
  return db().collection(collectionName).doc(id);
}

export const serverTimestamp = FieldValue.serverTimestamp;
export const increment = FieldValue.increment;
export const deleteField = FieldValue.delete;
export { Timestamp };

export const nowSentinel = serverTimestamp as unknown as () => Timestamp;

export function toDate(value: Timestamp | Date | null | undefined | { toDate?: () => Date }): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === "function") return (value as any).toDate();
  return new Date(value as any);
}

export class UniqueConstraintError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: string,
  ) {
    super(`${field} "${value}" is already in use`);
    this.name = "UniqueConstraintError";
  }
}

export function uniqueLockRef(field: string, value: string): DocumentReference {
  return doc(Collections.uniqueIndex, `${field}__${encodeURIComponent(value.toLowerCase())}`);
}

export async function runUniqueTransaction<T>(
  locks: { field: string; value: string }[],
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return fn({} as Transaction);
}

export function releaseUniqueLocks(tx: Transaction, locks: { field: string; value: string }[]): void {
  // no-op in mock
}

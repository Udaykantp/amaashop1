import "server-only";
import {
  FieldValue,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { adminFirestore } from "@/server/auth/admin";

/**
 * Firestore data-access layer. Replaces `src/server/db.ts` (Prisma/Cloud SQL).
 *
 * Firestore gives none of the guarantees Postgres did for free — no foreign
 * keys, no `@unique`, no unbounded multi-row transactions. This module is
 * where those guarantees get rebuilt deliberately:
 *   - `runUniqueTransaction` emulates a `@unique` column via a lock document,
 *     checked and written inside the same transaction as the real write.
 *   - Every model keeps its old `cuid()` as its Firestore document id, so
 *     every foreign-key-shaped string field written by the old app remains a
 *     valid reference after migration — no id remapping anywhere.
 *   - Cascading deletes (`onDelete: Cascade` in the old schema) must be
 *     written out explicitly at each call site; there is no equivalent here.
 */

// `globalThis`, not a module-scoped variable: Next.js dev-mode (HMR/Fast
// Refresh, and separate RSC vs. client module graphs) can re-evaluate this
// module without resetting the underlying firebase-admin `Firestore`
// singleton, which throws if `.settings()` is called on it a second time.
// A true process-global flag survives that; the module-scoped `let` didn't.
const globalForFirestore = globalThis as unknown as { firestoreSettingsApplied?: boolean };

export function db(): Firestore {
  const firestore = adminFirestore();
  // Undefined optional fields (e.g. `entry.entityId ?? undefined`) are common
  // throughout this codebase's data shapes; without this, writing any of them
  // throws instead of simply omitting the field the way Postgres NULL did.
  if (!globalForFirestore.firestoreSettingsApplied) {
    try {
      firestore.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already configured via another module instance — safe to ignore,
      // the setting itself is process-wide on the underlying singleton.
    }
    globalForFirestore.firestoreSettingsApplied = true;
  }
  return firestore;
}

/** Collection name constants — one per model, matching the old `@@map(...)` snake_case names. */
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
  /**
   * The old Supabase `orders` table (guest storefront checkout) — a
   * deliberately separate collection, not merged into `orders` above. That
   * table used its own snake_case shape (`customer_name`, lowercase
   * `status`, etc.) totally different from the admin/Prisma `Order` model,
   * and every storefront confirmation/order-history component is written
   * against that exact shape (`@/lib/types` `Order`). Reusing the same
   * collection would mean rewriting that UI for no functional gain — this
   * keeps the migration faithful (Supabase -> Firestore, no shape change).
   */
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
  /** Lock documents backing `runUniqueTransaction` — never read directly elsewhere. */
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

/**
 * `serverTimestamp()` returns a `FieldValue` sentinel that Firestore resolves
 * to a real `Timestamp` only after the write commits — but document interfaces
 * type these fields as `Timestamp` (what every *read* sees). Use this at write
 * sites instead of casting inline every time.
 */
export const nowSentinel = serverTimestamp as unknown as () => Timestamp;

/** `Timestamp | null | undefined` -> `Date | null`, for reading old Prisma `DateTime?` fields. */
export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Timestamp ? value.toDate() : value;
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

/** Firestore document ids can't contain "/"; unique values (emails, etc.) can. */
function encodeLockValue(value: string): string {
  return encodeURIComponent(value.toLowerCase());
}

/**
 * The lock document backing a `@unique`-style constraint on `field` (e.g.
 * `"memberCode"`, or a composite like `"productId_retailer"`). Exported so
 * call sites that need finer control than `runUniqueTransaction` gives (e.g.
 * `joinNetwork`'s retry-until-free code allocation) can read/claim/release
 * locks directly inside their own transaction.
 */
export function uniqueLockRef(field: string, value: string): DocumentReference {
  return doc(Collections.uniqueIndex, `${field}__${encodeLockValue(value)}`);
}

/**
 * Emulates a Postgres `@unique` constraint (or a composite `@@unique`, if
 * `field` encodes multiple columns e.g. `"productId_retailer"`). Reads every
 * lock doc first (Firestore transactions require all reads before any
 * write), throws `UniqueConstraintError` if any is already taken, otherwise
 * runs `fn` and then claims every lock — all atomically in one transaction.
 *
 * `fn` may perform its own additional reads/writes via the given
 * `Transaction`, but per Firestore's rules any reads it does must happen
 * before any writes (its own, or this helper's lock claims, which are
 * written after `fn` returns).
 */
export async function runUniqueTransaction<T>(
  locks: { field: string; value: string }[],
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const refs = locks.map((l) => uniqueLockRef(l.field, l.value));
  return db().runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    snaps.forEach((snap, i) => {
      if (snap.exists) throw new UniqueConstraintError(locks[i]!.field, locks[i]!.value);
    });
    const result = await fn(tx);
    refs.forEach((ref, i) => {
      tx.set(ref, {
        field: locks[i]!.field,
        value: locks[i]!.value,
        createdAt: serverTimestamp(),
      });
    });
    return result;
  });
}

/** Release unique locks previously claimed by `runUniqueTransaction`, e.g. on delete or value change. */
export function releaseUniqueLocks(tx: Transaction, locks: { field: string; value: string }[]): void {
  for (const l of locks) tx.delete(uniqueLockRef(l.field, l.value));
}

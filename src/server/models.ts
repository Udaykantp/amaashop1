import type { Timestamp } from "firebase-admin/firestore";
import type {
  CommissionRunStatus,
  CommissionType,
  ContentType,
  DomainEventType,
  EventStatus,
  FamilyRelation,
  KycStatus,
  LedgerStatus,
  MemberApplicationSource,
  MemberApplicationStatus,
  MemberStatus,
  NotificationChannel,
  NotificationStatus,
  PaymentStatus,
  PayoutBatchStatus,
  PayoutItemStatus,
  BinaryLeg,
  PlacementStrategy,
  ProductStatus,
  Retailer,
  ReviewStatus,
  RuleSetStatus,
  StockReason,
  TransferStatus,
  UserRole,
  UserStatus,
  WalletTxnType,
  WithdrawalStatus,
} from "@/server/enums";

/**
 * Firestore document shapes, one per collection in `src/server/firestore.ts`
 * `Collections`. Mirrors `prisma/schema.prisma` field-for-field so the export
 * pipeline (see `scripts/migrate-to-firestore/`) is a mechanical mapping.
 *
 * Conventions:
 *  - The document id (old `cuid()`) is NOT repeated as a field — read helpers
 *    attach it back as `id` via `withId()` below, matching how Prisma rows
 *    always carried `.id`.
 *  - Money fields are `string` (fixed 2dp) — see `moneyToFirestore` /
 *    `moneyFromFirestore` in `@/server/money`. Never read/write them directly.
 *  - `DateTime` -> `Timestamp`. `DateTime?` -> `Timestamp | null`.
 *  - `Json` -> `Record<string, unknown>` (or a narrower type where one
 *    already exists in `@/lib/types`).
 */

export type WithId<T> = T & { id: string };

export function withId<T>(id: string, data: T): WithId<T> {
  return { id, ...data };
}

// ── Identity ─────────────────────────────────────────────────────────────

export interface AppUserDoc {
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  extraCapabilities: string[];
  deniedCapabilities: string[];
  /**
   * Denormalized from `member_profiles` (kept in sync by `joinNetwork` /
   * `deleteDistributor`) — avoids an extra query on every session load, which
   * the old `AppUser.memberProfile` relation include did for free.
   */
  memberProfileId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Genealogy ────────────────────────────────────────────────────────────

export interface MemberProfileDoc {
  userId: string;
  memberCode: string;
  /** The referrer — who brought this member in. Never changes with placement/spillover. */
  sponsorId: string | null;
  /**
   * Binary tree parent — who this member sits directly under. Differs from
   * `sponsorId` whenever the member "spilled over". Null for the root. Absent on
   * members not yet migrated from the old unilevel tree (`placementStrategy`
   * UNILEVEL) — see `scripts/migrate-to-binary.ts`.
   */
  placementParentId?: string | null;
  /** Slot under `placementParentId`. Null for the root. */
  leg?: BinaryLeg | null;
  placementStrategy: PlacementStrategy;
  status: MemberStatus;
  joinedAt: Timestamp;
  joiningOrderId: string | null;
  frozenAt: Timestamp | null;
  frozenReason: string | null;
  terminatedAt: Timestamp | null;
  compressedIntoId: string | null;
  lastMovedAt: Timestamp | null;
  lastMovedFromId: string | null;
}

export interface NetworkClosureDoc {
  ancestorId: string;
  descendantId: string;
  depth: number;
  /**
   * Denormalized from the descendant's `MemberProfile.joinedAt` at the moment
   * this edge is created (immutable thereafter) — lets `getDownlineAtLevel`
   * paginate by join date server-side instead of over-fetching and sorting
   * in memory.
   */
  descendantJoinedAt: Timestamp;
}

export interface FamilyMemberDoc {
  memberProfileId: string;
  relation: FamilyRelation;
  name: string;
  aadhaarEnc: string | null;
  aadhaarLast4: string | null;
  panEnc: string | null;
  panLast4: string | null;
  isNominee: boolean;
  nomineeSharePct: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── KYC ──────────────────────────────────────────────────────────────────

/** Doc id = `userId` (1:1 with AppUser) — was a separate `cuid()` under Prisma. */
export interface KycProfileDoc {
  userId: string;
  status: KycStatus;
  aadhaarEnc: string | null;
  aadhaarLast4: string | null;
  aadhaarHash: string | null;
  panEnc: string | null;
  panLast4: string | null;
  panHash: string | null;
  bankAccountEnc: string | null;
  bankAccountLast4: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  documentPaths: Record<string, string> | null;
  consentAcceptedAt: Timestamp | null;
  submittedAt: Timestamp | null;
  reviewedByUserId: string | null;
  reviewedAt: Timestamp | null;
  rejectionReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Member applications ──────────────────────────────────────────────────

export interface MemberApplicationDoc {
  referrerInput: string;
  sponsorId: string | null;
  sponsorCodeSnapshot: string | null;
  fullName: string;
  phone: string;
  phoneHash: string;
  email: string | null;
  age: number;
  gender: string | null;
  familyMemberCount: number;
  idProofType: string | null;
  idProofLast4: string | null;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  nomineeName: string | null;
  sponsorConfirmed: boolean;
  /** Side of the sponsor's binary tree the referral link asked for; admin can override at approval. */
  preferredLeg?: BinaryLeg | null;
  termsAcceptedAt: Timestamp | null;
  consentIp: string | null;
  consentUserAgent: string | null;
  captchaVerifiedAt: Timestamp | null;
  source: MemberApplicationSource;
  createdByUserId: string | null;
  status: MemberApplicationStatus;
  reviewedByUserId: string | null;
  reviewedAt: Timestamp | null;
  reviewNote: string | null;
  memberProfileId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Catalog, sites, inventory ────────────────────────────────────────────

export interface SiteDoc {
  name: string;
  domain: string;
  isPrimary: boolean;
  createdAt: Timestamp;
}

export interface CategoryDoc {
  name: string;
  slug: string;
  iconKey: string | null;
  sortOrder: number;
}

export interface ProductDoc {
  sku: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  brand: string | null;
  categoryId: string | null;
  tags: string[];
  status: ProductStatus;
  publishedAt: Timestamp | null;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isLatest: boolean;
  mrp: string;
  sellingPrice: string;
  gstRateBps: number;
  hsnCode: string | null;
  gtin: string | null;
  unitLabel: string | null;
  weightGrams: number | null;
  pv: string;
  bv: string;
  autoshipEligible: boolean;
  imageUrl: string | null;
  images: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  focusKeyword: string | null;
  rating: string;
  reviews: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUserId: string | null;
  updatedByUserId: string | null;
}

/** Subcollection: `products/{productId}/images/{id}`. */
export interface ProductImageDoc {
  url: string;
  alt: string | null;
  position: number;
  createdAt: Timestamp;
}

/** Subcollection: `products/{productId}/reviews/{id}`. */
export interface ProductReviewDoc {
  authorName: string;
  authorUserId: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  verifiedBuyer: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WarehouseDoc {
  siteId: string;
  name: string;
  address: Record<string, unknown> | null;
}

/** Doc id: `{productId}_{warehouseId}`. */
export interface InventoryItemDoc {
  productId: string;
  warehouseId: string;
  qtyAvailable: number;
  qtyReserved: number;
  updatedAt: Timestamp;
}

export interface StockLedgerEntryDoc {
  productId: string;
  warehouseId: string;
  delta: number;
  reason: StockReason;
  refType: string | null;
  refId: string | null;
  createdByUserId: string | null;
  note: string | null;
  createdAt: Timestamp;
}

export interface SiteStockTransferDoc {
  fromSiteId: string;
  toSiteId: string;
  productId: string;
  qty: number;
  unitCost: string;
  status: TransferStatus;
  createdAt: Timestamp;
  dispatchedAt: Timestamp | null;
  receivedAt: Timestamp | null;
}

export interface ProductVariantDoc {
  productId: string;
  sku: string;
  weightGrams: number;
  label: string;
  mrp: string;
  sellingPrice: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AffiliateLinkDoc {
  productId: string;
  retailer: Retailer;
  url: string;
  enabled: boolean;
  clicks: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Doc id: `{variantId}_{retailer}`. */
export interface CompetitorPriceDoc {
  variantId: string;
  retailer: Retailer;
  price: string | null;
  currency: string;
  sourceUrl: string | null;
  inStock: boolean;
  lastUpdated: Timestamp;
}

// ── Orders, payments, GST ────────────────────────────────────────────────

export interface OrderDoc {
  orderNo: string;
  userId: string | null;
  placedByMemberId: string | null;
  type: "STOREFRONT" | "REPURCHASE" | "JOINING";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";
  siteId: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
  walletApplied: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: Record<string, unknown>;
  buyerStateCode: string | null;
  createdAt: Timestamp;
  confirmedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  /** Migration provenance for rows merged in from the old Supabase `orders` table. */
  source?: "storefront_guest";
}

/** Subcollection: `orders/{orderId}/items/{id}`. */
export interface OrderItemDoc {
  productId: string | null;
  sku: string;
  name: string;
  qty: number;
  unitPrice: string;
  gstRateBps: number;
  lineTax: string;
  lineTotal: string;
}

export interface PaymentDoc {
  orderId: string;
  provider: string;
  providerRef: string | null;
  method: string | null;
  amount: string;
  status: PaymentStatus;
  idempotencyKey: string;
  rawPayload: Record<string, unknown> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GstInvoiceDoc {
  orderId: string;
  invoiceNo: string;
  sellerStateCode: string;
  buyerStateCode: string;
  placeOfSupply: string;
  isInterState: boolean;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  pdfPath: string | null;
  issuedAt: Timestamp;
}

// ── Guest storefront checkout (migrated from the old Supabase `orders` table) ─

export interface GuestOrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export interface GuestOrderDoc {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  city: string;
  zip_code: string | null;
  items: GuestOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: Timestamp;
}

// ── Commission config ────────────────────────────────────────────────────

export interface CommissionRuleSetDoc {
  name: string;
  status: RuleSetStatus;
  effectiveFrom: Timestamp;
  effectiveTo: Timestamp | null;
  ruleJson: Record<string, unknown>;
  confirmPending: Record<string, unknown> | null;
  createdByUserId: string | null;
  note: string | null;
  createdAt: Timestamp;
}

// ── Wallet & ledgers ─────────────────────────────────────────────────────

/** Doc id = `userId` (1:1 with AppUser) — was a separate `cuid()` under Prisma. */
export interface WalletDoc {
  userId: string;
  balanceCache: string;
  settledBalance: string;
  updatedAt: Timestamp;
}

export interface CommissionLedgerEntryDoc {
  beneficiaryId: string;
  sourceOrderId: string;
  sourceMemberId: string | null;
  ruleSetId: string;
  level: number;
  type: CommissionType;
  amount: string;
  status: LedgerStatus;
  idempotencyKey: string;
  reversalOfId: string | null;
  heldReason: string | null;
  runId: string | null;
  createdAt: Timestamp;
  postedAt: Timestamp | null;
}

export interface CommissionRunDoc {
  label: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: CommissionRunStatus;
  entryCount: number;
  totalAmount: string;
  previewJson: Record<string, unknown> | null;
  createdByUserId: string | null;
  previewedAt: Timestamp | null;
  releasedByUserId: string | null;
  releasedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface WithdrawalRequestDoc {
  userId: string;
  amount: string;
  status: WithdrawalStatus;
  bankAccountLast4: string | null;
  ifsc: string | null;
  requestedAt: Timestamp;
  reviewedByUserId: string | null;
  reviewedAt: Timestamp | null;
  reviewNote: string | null;
  payoutItemId: string | null;
  createdAt: Timestamp;
}

/** Also mirrored under `wallets/{walletId}/transactions/{id}`. */
export interface WalletTransactionDoc {
  walletId: string;
  ledgerEntryId: string | null;
  payoutItemId: string | null;
  type: WalletTxnType;
  amount: string;
  balanceAfter: string;
  note: string | null;
  createdAt: Timestamp;
}

export interface TrustFundLedgerEntryDoc {
  sourceOrderId: string;
  sourceMemberId: string | null;
  ruleSetId: string;
  amount: string;
  note: string | null;
  createdAt: Timestamp;
}

// ── Payouts ──────────────────────────────────────────────────────────────

export interface PayoutBatchDoc {
  batchNo: string;
  status: PayoutBatchStatus;
  lockToken: string | null;
  totalGross: string;
  totalTds: string;
  totalNet: string;
  createdByUserId: string | null;
  lockedAt: Timestamp | null;
  processedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface PayoutItemDoc {
  batchId: string;
  userId: string;
  grossAmount: string;
  tdsAmount: string;
  netAmount: string;
  bankAccountLast4: string | null;
  ifsc: string | null;
  gatewayRef: string | null;
  status: PayoutItemStatus;
  failureReason: string | null;
  processedAt: Timestamp | null;
  createdAt: Timestamp;
}

// ── Async queue ──────────────────────────────────────────────────────────

export interface DomainEventDoc {
  type: DomainEventType;
  orderId: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: EventStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Timestamp;
  processedAt: Timestamp | null;
}

export interface CommissionJobDoc {
  domainEventId: string;
  beneficiaryId: string;
  level: number;
  status: EventStatus;
  attempts: number;
  lastError: string | null;
  ledgerEntryId: string | null;
  createdAt: Timestamp;
  processedAt: Timestamp | null;
}

// ── Notifications, audit, CMS ────────────────────────────────────────────

export interface NotificationDoc {
  userId: string;
  type: string;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  sentAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface AuditLogDoc {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Timestamp;
}

export interface ContentBlockDoc {
  key: string;
  type: ContentType;
  payload: Record<string, unknown>;
  isPublished: boolean;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  updatedByUserId: string | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

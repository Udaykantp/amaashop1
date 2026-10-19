/**
 * Plain string-literal union types replacing the enums Prisma used to
 * generate from `schema.prisma`. Firestore stores these as plain strings —
 * there's no schema/generator step, so this file is the source of truth
 * every part of the app imports from instead of `@prisma/client`.
 */

export type UserRole =
  | "SUPER_ADMIN"
  | "OPS_ADMIN"
  | "FINANCE_ADMIN"
  | "STORE_MANAGER"
  | "SUPPORT_COMPLIANCE"
  | "MEMBER"
  | "CONSUMER";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export type PlacementStrategy = "UNILEVEL" | "BINARY" | "MATRIX";

/** Which of a member's two frontline slots a binary-tree child occupies. */
export type BinaryLeg = "LEFT" | "RIGHT";

export type MemberStatus = "PENDING_KYC" | "ACTIVE" | "SUSPENDED" | "TERMINATED";

export type KycStatus = "NOT_SUBMITTED" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export type FamilyRelation = "SELF" | "SPOUSE" | "SON" | "DAUGHTER" | "FATHER" | "MOTHER";

export type MemberApplicationStatus = "PENDING" | "ON_HOLD" | "APPROVED" | "REJECTED";

export type MemberApplicationSource = "PUBLIC" | "ADMIN";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";

export type StockReason =
  | "PURCHASE_IN"
  | "SALE_OUT"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "ADJUSTMENT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "RETURN_IN";

export type TransferStatus = "DRAFT" | "DISPATCHED" | "RECEIVED" | "CANCELLED";

export type Retailer = "AMAZON" | "FLIPKART" | "JIOMART";

export type OrderType = "STOREFRONT" | "REPURCHASE" | "JOINING";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";

export type RuleSetStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type CommissionType =
  | "JOINING_LEVEL_INCOME"
  | "REPURCHASE_COMMISSION"
  | "TRUST_CONTRIBUTION"
  | "CLAWBACK"
  | "ADJUSTMENT";

export type LedgerStatus = "PENDING" | "POSTED" | "HELD" | "REVERSED";

export type CommissionRunStatus = "DRAFT" | "PREVIEWED" | "RELEASED" | "FAILED";

export type WithdrawalStatus = "PENDING" | "APPROVED" | "ON_HOLD" | "REJECTED" | "PAID";

export type WalletTxnType =
  | "CREDIT_COMMISSION"
  | "DEBIT_WITHDRAWAL"
  | "DEBIT_CLAWBACK"
  | "CREDIT_REFUND"
  | "ADJUSTMENT";

export type PayoutBatchStatus =
  | "DRAFT"
  | "LOCKED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED";

export type PayoutItemStatus = "PENDING" | "SENT" | "SUCCESS" | "FAILED" | "REVERSED";

export type DomainEventType = "MEMBER_JOINED" | "REPURCHASE_CONFIRMED" | "ORDER_CANCELLED";

export type EventStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "DEAD_LETTER";

export type NotificationChannel = "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";

export type NotificationStatus = "QUEUED" | "SENT" | "FAILED";

export type ContentType = "BANNER" | "ANNOUNCEMENT" | "PAGE";

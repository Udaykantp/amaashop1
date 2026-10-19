-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN', 'STORE_MANAGER', 'SUPPORT_COMPLIANCE', 'MEMBER', 'CONSUMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlacementStrategy" AS ENUM ('UNILEVEL', 'BINARY', 'MATRIX');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING_KYC', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER');

-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('PURCHASE_IN', 'SALE_OUT', 'RESERVATION', 'RESERVATION_RELEASE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RETURN_IN');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('STOREFRONT', 'REPURCHASE', 'JOINING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('JOINING_LEVEL_INCOME', 'REPURCHASE_COMMISSION', 'TRUST_CONTRIBUTION', 'CLAWBACK', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('PENDING', 'POSTED', 'HELD', 'REVERSED');

-- CreateEnum
CREATE TYPE "CommissionRunStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'RELEASED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'ON_HOLD', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT_COMMISSION', 'DEBIT_WITHDRAWAL', 'DEBIT_CLAWBACK', 'CREDIT_REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayoutBatchStatus" AS ENUM ('DRAFT', 'LOCKED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutItemStatus" AS ENUM ('PENDING', 'SENT', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DomainEventType" AS ENUM ('MEMBER_JOINED', 'REPURCHASE_CONFIRMED', 'ORDER_CANCELLED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BANNER', 'ANNOUNCEMENT', 'PAGE');

-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CONSUMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "extraCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deniedCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "sponsorId" TEXT,
    "placementStrategy" "PlacementStrategy" NOT NULL DEFAULT 'UNILEVEL',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joiningOrderId" TEXT,
    "frozenAt" TIMESTAMP(3),
    "frozenReason" TEXT,
    "terminatedAt" TIMESTAMP(3),
    "compressedIntoId" TEXT,
    "lastMovedAt" TIMESTAMP(3),
    "lastMovedFromId" TEXT,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_closure" (
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "network_closure_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "kyc_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "aadhaarEnc" TEXT,
    "aadhaarLast4" TEXT,
    "aadhaarHash" TEXT,
    "panEnc" TEXT,
    "panLast4" TEXT,
    "panHash" TEXT,
    "bankAccountEnc" TEXT,
    "bankAccountLast4" TEXT,
    "ifsc" TEXT,
    "accountHolderName" TEXT,
    "documentPaths" JSONB,
    "consentAcceptedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "relation" "FamilyRelation" NOT NULL,
    "name" TEXT NOT NULL,
    "aadhaarEnc" TEXT,
    "aadhaarLast4" TEXT,
    "panEnc" TEXT,
    "panLast4" TEXT,
    "isNominee" BOOLEAN NOT NULL DEFAULT false,
    "nomineeSharePct" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "mrp" DECIMAL(14,2) NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "gstRateBps" INTEGER NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "unitLabel" TEXT,
    "pv" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bv" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "autoshipEligible" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "images" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qtyAvailable" INTEGER NOT NULL DEFAULT 0,
    "qtyReserved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("productId","warehouseId")
);

-- CreateTable
CREATE TABLE "stock_ledger_entries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "StockReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_stock_transfers" (
    "id" TEXT NOT NULL,
    "fromSiteId" TEXT NOT NULL,
    "toSiteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "site_stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" TEXT,
    "placedByMemberId" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'STOREFRONT',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "siteId" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "walletApplied" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" JSONB NOT NULL,
    "buyerStateCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "gstRateBps" INTEGER NOT NULL DEFAULT 0,
    "lineTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "method" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_invoices" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "sellerStateCode" TEXT NOT NULL,
    "buyerStateCode" TEXT NOT NULL,
    "placeOfSupply" TEXT NOT NULL,
    "isInterState" BOOLEAN NOT NULL,
    "taxableValue" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "pdfPath" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rule_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "ruleJson" JSONB NOT NULL,
    "confirmPending" JSONB,
    "createdByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCache" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "settledBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger_entries" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sourceOrderId" TEXT NOT NULL,
    "sourceMemberId" TEXT,
    "ruleSetId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "type" "CommissionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "LedgerStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "reversalOfId" TEXT,
    "heldReason" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "commission_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_runs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "CommissionRunStatus" NOT NULL DEFAULT 'DRAFT',
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previewJson" JSONB,
    "createdByUserId" TEXT,
    "previewedAt" TIMESTAMP(3),
    "releasedByUserId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountLast4" TEXT,
    "ifsc" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "payoutItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "payoutItemId" TEXT,
    "type" "WalletTxnType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_fund_ledger_entries" (
    "id" TEXT NOT NULL,
    "sourceOrderId" TEXT NOT NULL,
    "sourceMemberId" TEXT,
    "ruleSetId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_fund_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_batches" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "lockToken" TEXT,
    "totalGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalTds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "tdsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "bankAccountLast4" TEXT,
    "ifsc" TEXT,
    "gatewayRef" TEXT,
    "status" "PayoutItemStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "type" "DomainEventType" NOT NULL,
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_jobs" (
    "id" TEXT NOT NULL,
    "domainEventId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "commission_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "payload" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_phone_key" ON "app_users"("phone");

-- CreateIndex
CREATE INDEX "app_users_role_idx" ON "app_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_userId_key" ON "member_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_memberCode_key" ON "member_profiles"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_joiningOrderId_key" ON "member_profiles"("joiningOrderId");

-- CreateIndex
CREATE INDEX "member_profiles_sponsorId_idx" ON "member_profiles"("sponsorId");

-- CreateIndex
CREATE INDEX "member_profiles_status_idx" ON "member_profiles"("status");

-- CreateIndex
CREATE INDEX "network_closure_descendantId_depth_idx" ON "network_closure"("descendantId", "depth");

-- CreateIndex
CREATE INDEX "network_closure_ancestorId_depth_idx" ON "network_closure"("ancestorId", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_userId_key" ON "kyc_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_aadhaarHash_key" ON "kyc_profiles"("aadhaarHash");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_panHash_key" ON "kyc_profiles"("panHash");

-- CreateIndex
CREATE INDEX "kyc_profiles_status_idx" ON "kyc_profiles"("status");

-- CreateIndex
CREATE INDEX "family_members_memberProfileId_idx" ON "family_members"("memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "sites_domain_key" ON "sites"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "warehouses_siteId_idx" ON "warehouses"("siteId");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_productId_warehouseId_idx" ON "stock_ledger_entries"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_ledger_entries_refType_refId_idx" ON "stock_ledger_entries"("refType", "refId");

-- CreateIndex
CREATE INDEX "site_stock_transfers_productId_idx" ON "site_stock_transfers"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_type_idx" ON "orders"("type");

-- CreateIndex
CREATE INDEX "orders_confirmedAt_idx" ON "orders"("confirmedAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoices_orderId_key" ON "gst_invoices"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoices_invoiceNo_key" ON "gst_invoices"("invoiceNo");

-- CreateIndex
CREATE INDEX "commission_rule_sets_status_effectiveFrom_idx" ON "commission_rule_sets"("status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_ledger_entries_idempotencyKey_key" ON "commission_ledger_entries"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "commission_ledger_entries_reversalOfId_key" ON "commission_ledger_entries"("reversalOfId");

-- CreateIndex
CREATE INDEX "commission_ledger_entries_beneficiaryId_type_idx" ON "commission_ledger_entries"("beneficiaryId", "type");

-- CreateIndex
CREATE INDEX "commission_ledger_entries_sourceOrderId_idx" ON "commission_ledger_entries"("sourceOrderId");

-- CreateIndex
CREATE INDEX "commission_ledger_entries_status_idx" ON "commission_ledger_entries"("status");

-- CreateIndex
CREATE INDEX "commission_ledger_entries_runId_idx" ON "commission_ledger_entries"("runId");

-- CreateIndex
CREATE INDEX "commission_runs_status_idx" ON "commission_runs"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_idx" ON "withdrawal_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_ledgerEntryId_key" ON "wallet_transactions"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "trust_fund_ledger_entries_createdAt_idx" ON "trust_fund_ledger_entries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_batches_batchNo_key" ON "payout_batches"("batchNo");

-- CreateIndex
CREATE INDEX "payout_items_batchId_idx" ON "payout_items"("batchId");

-- CreateIndex
CREATE INDEX "payout_items_userId_idx" ON "payout_items"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_events_idempotencyKey_key" ON "domain_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "domain_events_status_createdAt_idx" ON "domain_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "commission_jobs_status_idx" ON "commission_jobs"("status");

-- CreateIndex
CREATE INDEX "commission_jobs_domainEventId_idx" ON "commission_jobs"("domainEventId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_key_key" ON "content_blocks"("key");

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_joiningOrderId_fkey" FOREIGN KEY ("joiningOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_closure" ADD CONSTRAINT "network_closure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_closure" ADD CONSTRAINT "network_closure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger_entries" ADD CONSTRAINT "stock_ledger_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_stock_transfers" ADD CONSTRAINT "site_stock_transfers_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_stock_transfers" ADD CONSTRAINT "site_stock_transfers_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_stock_transfers" ADD CONSTRAINT "site_stock_transfers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_placedByMemberId_fkey" FOREIGN KEY ("placedByMemberId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_invoices" ADD CONSTRAINT "gst_invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "member_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "commission_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "commission_ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_runId_fkey" FOREIGN KEY ("runId") REFERENCES "commission_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "commission_ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payoutItemId_fkey" FOREIGN KEY ("payoutItemId") REFERENCES "payout_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_fund_ledger_entries" ADD CONSTRAINT "trust_fund_ledger_entries_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_fund_ledger_entries" ADD CONSTRAINT "trust_fund_ledger_entries_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_fund_ledger_entries" ADD CONSTRAINT "trust_fund_ledger_entries_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "commission_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payout_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_jobs" ADD CONSTRAINT "commission_jobs_domainEventId_fkey" FOREIGN KEY ("domainEventId") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

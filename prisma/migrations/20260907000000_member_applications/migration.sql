-- CreateEnum
CREATE TYPE "MemberApplicationStatus" AS ENUM ('PENDING', 'ON_HOLD', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "member_applications" (
    "id" TEXT NOT NULL,
    "referrerInput" TEXT NOT NULL,
    "sponsorId" TEXT,
    "sponsorCodeSnapshot" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER NOT NULL,
    "gender" TEXT,
    "familyMemberCount" INTEGER NOT NULL,
    "idProofType" TEXT,
    "idProofLast4" TEXT,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "nomineeName" TEXT,
    "sponsorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "consentUserAgent" TEXT,
    "captchaVerifiedAt" TIMESTAMP(3),
    "status" "MemberApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "memberProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_applications_phoneHash_key" ON "member_applications"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "member_applications_memberProfileId_key" ON "member_applications"("memberProfileId");

-- CreateIndex
CREATE INDEX "member_applications_status_createdAt_idx" ON "member_applications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "member_applications_sponsorId_idx" ON "member_applications"("sponsorId");

-- AddForeignKey
ALTER TABLE "member_applications" ADD CONSTRAINT "member_applications_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_applications" ADD CONSTRAINT "member_applications_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

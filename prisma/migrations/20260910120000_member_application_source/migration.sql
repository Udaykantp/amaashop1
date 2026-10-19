-- CreateEnum
CREATE TYPE "MemberApplicationSource" AS ENUM ('PUBLIC', 'ADMIN');

-- AlterTable
ALTER TABLE "member_applications"
  ADD COLUMN "source" "MemberApplicationSource" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "member_applications_source_idx" ON "member_applications"("source");

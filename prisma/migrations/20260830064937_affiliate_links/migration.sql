-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailer" "Retailer" NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_links_productId_idx" ON "affiliate_links"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_productId_retailer_key" ON "affiliate_links"("productId", "retailer");

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

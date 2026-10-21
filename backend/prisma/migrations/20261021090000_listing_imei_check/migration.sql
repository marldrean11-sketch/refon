-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "imei_checked_at" TIMESTAMPTZ(3),
ADD COLUMN     "imei_hash" CHAR(64);

-- CreateIndex
CREATE INDEX "listings_imei_hash_idx" ON "listings"("imei_hash");

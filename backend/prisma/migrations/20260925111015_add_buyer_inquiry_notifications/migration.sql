-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INQUIRY_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'LISTING_SOLD';

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "buyer_id" UUID;

-- CreateIndex
CREATE INDEX "inquiries_buyer_id_idx" ON "inquiries"("buyer_id");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

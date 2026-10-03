-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "inquiries_listing_id_is_read_idx" ON "inquiries"("listing_id", "is_read");

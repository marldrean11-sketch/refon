-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'MISLEADING', 'WRONG_INFO', 'PROHIBITED_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LISTING_TAKEN_DOWN';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_RESOLVED';

-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "moderator_feedback" TEXT;

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_listing_id_idx" ON "reports"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_listing_id_reporter_id_key" ON "reports"("listing_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ReFon catalog fields.
--
-- Additive only: every existing column and row is preserved, `cosmetic_condition`
-- is kept, and the graded column is backfilled from it. The backfill maps the
-- existing free-text labels onto the A/B/C scale:
--   'Like New', 'Excellent', 'Mint'                     -> A
--   'Good', 'Very Good'                                 -> B
--   everything else ('Fair', 'Used', unrecognised)       -> C
-- Anything with no label at all stays NULL so the UI can say "not graded yet"
-- instead of inventing a grade.

-- CreateEnum
CREATE TYPE "ConditionGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- AlterTable: sellers
ALTER TABLE "sellers"
  ADD COLUMN "city" VARCHAR(120),
  ADD COLUMN "region" VARCHAR(120),
  ADD COLUMN "tagline" VARCHAR(200),
  ADD COLUMN "rating_average" DECIMAL(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completed_sales" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: listings
ALTER TABLE "listings"
  ADD COLUMN "slug" VARCHAR(180),
  ADD COLUMN "original_price" DECIMAL(12, 2),
  ADD COLUMN "condition_grade" "ConditionGrade",
  ADD COLUMN "warranty_months" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ram" VARCHAR(40),
  ADD COLUMN "operating_system" VARCHAR(80),
  ADD COLUMN "network_type" VARCHAR(80),
  ADD COLUMN "processor" VARCHAR(120),
  ADD COLUMN "display_spec" VARCHAR(200),
  ADD COLUMN "camera_spec" VARCHAR(240),
  ADD COLUMN "category_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "inspection_checks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "imei_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "imei_last4" CHAR(4),
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "views_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- Backfill the graded column from the legacy free-text condition label.
UPDATE "listings"
SET "condition_grade" = CASE
  WHEN lower(btrim("cosmetic_condition")) IN ('like new', 'excellent', 'mint') THEN 'A'::"ConditionGrade"
  WHEN lower(btrim("cosmetic_condition")) IN ('good', 'very good') THEN 'B'::"ConditionGrade"
  WHEN btrim("cosmetic_condition") <> '' THEN 'C'::"ConditionGrade"
  ELSE NULL
END;

-- Backfill a slug for existing rows so canonical product URLs resolve immediately.
-- Format: <brand>-<model>-<storage-slug>, lowercased and hyphenated. The trailing
-- id fragment keeps the value unique when two listings share a brand, model, and
-- storage, which happens once several sellers list the same phone.
UPDATE "listings"
SET "slug" = concat_ws('-',
  regexp_replace(lower(btrim("brand")), '[^a-z0-9]+', '-', 'g'),
  regexp_replace(lower(btrim("model")), '[^a-z0-9]+', '-', 'g'),
  regexp_replace(lower(btrim("storage")), '[^a-z0-9]+', '-', 'g'),
  right("id"::text, 4)
);

-- Unique index on the backfilled slugs.
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateTable: reviews
CREATE TABLE "reviews" (
  "id" UUID NOT NULL,
  "listing_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(160),
  "comment" TEXT NOT NULL,
  "condition_rating" INTEGER,
  "seller_rating" INTEGER,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_listing_id_user_id_key" ON "reviews"("listing_id", "user_id");

-- CreateIndex
CREATE INDEX "reviews_listing_id_status_created_at_idx" ON "reviews"("listing_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "reviews_user_id_created_at_idx" ON "reviews"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catalog indexes.
CREATE INDEX "listings_status_condition_grade_idx" ON "listings"("status", "condition_grade");
CREATE INDEX "listings_status_price_idx" ON "listings"("status", "price");
CREATE INDEX "listings_status_battery_percent_idx" ON "listings"("status", "battery_percent");
CREATE INDEX "listings_status_is_featured_idx" ON "listings"("status", "is_featured");
CREATE INDEX "sellers_rating_average_idx" ON "sellers"("rating_average");

-- Integrity constraints for the new columns.
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_original_price_check" CHECK ("original_price" IS NULL OR "original_price" > 0),
  ADD CONSTRAINT "listings_warranty_months_check" CHECK ("warranty_months" BETWEEN 0 AND 24),
  ADD CONSTRAINT "listings_quantity_check" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "listings_views_count_check" CHECK ("views_count" >= 0),
  ADD CONSTRAINT "listings_imei_last4_check" CHECK ("imei_last4" IS NULL OR "imei_last4" ~ '^[0-9]{4}$');

ALTER TABLE "sellers"
  ADD CONSTRAINT "sellers_rating_average_check" CHECK ("rating_average" >= 0 AND "rating_average" <= 5),
  ADD CONSTRAINT "sellers_rating_count_check" CHECK ("rating_count" >= 0),
  ADD CONSTRAINT "sellers_completed_sales_check" CHECK ("completed_sales" >= 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_condition_rating_check" CHECK ("condition_rating" IS NULL OR "condition_rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_seller_rating_check" CHECK ("seller_rating" IS NULL OR "seller_rating" BETWEEN 1 AND 5);

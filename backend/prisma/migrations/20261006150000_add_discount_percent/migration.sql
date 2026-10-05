-- Denormalised discount percentage.
--
-- "Biggest Discount" must order by how large the saving is as a proportion of the
-- original price. Prisma cannot order by a computed expression, and ordering by
-- `original_price` instead would rank a high-priced phone with a 40% saving above
-- a cheap phone with a 74% saving. Storing the percentage keeps the sort in the
-- database so it stays paginated, indexed, and injection-free.
--
-- This follows the pattern already used by `sellers.rating_average`.

ALTER TABLE "listings" ADD COLUMN "discount_percent" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the existing reference prices.
UPDATE "listings"
SET "discount_percent" = CASE
  WHEN "original_price" IS NOT NULL AND "original_price" > "price" AND "original_price" > 0
    THEN LEAST(100, GREATEST(0, ROUND(("original_price" - "price") / "original_price" * 100)::int))
  ELSE 0
END;

ALTER TABLE "listings"
  ADD CONSTRAINT "listings_discount_percent_check" CHECK ("discount_percent" BETWEEN 0 AND 100);

CREATE INDEX "listings_status_discount_percent_idx" ON "listings"("status", "discount_percent");

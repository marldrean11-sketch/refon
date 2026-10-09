-- Seeded demo reviews are sample data, not buyer feedback. The flag keeps them
-- out of every public review list and rating average.
ALTER TABLE "reviews" ADD COLUMN "is_sample" BOOLEAN NOT NULL DEFAULT false;

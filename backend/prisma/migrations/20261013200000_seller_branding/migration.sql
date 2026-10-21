-- Storefront branding: a logo, a banner and one of a fixed set of brand colours.
ALTER TABLE "sellers"
  ADD COLUMN "logo_url" VARCHAR(500),
  ADD COLUMN "banner_url" VARCHAR(500),
  ADD COLUMN "brand_color" VARCHAR(20);

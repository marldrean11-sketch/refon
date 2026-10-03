-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER', 'BUYER');

-- CreateEnum
CREATE TYPE "SellerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR(160) NOT NULL,
    "contact_info" VARCHAR(320) NOT NULL,
    "verification_status" "SellerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "battery_percent" INTEGER NOT NULL,
    "storage" VARCHAR(64) NOT NULL,
    "condition_notes" TEXT NOT NULL,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "moderator_feedback" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "listings_year_check" CHECK ("year" BETWEEN 2015 AND 2024),
    CONSTRAINT "listings_battery_percent_check" CHECK ("battery_percent" BETWEEN 0 AND 100)
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_name" VARCHAR(120) NOT NULL,
    "buyer_contact" VARCHAR(320) NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_user_id_key" ON "sellers"("user_id");

-- CreateIndex
CREATE INDEX "sellers_verification_status_idx" ON "sellers"("verification_status");

-- CreateIndex
CREATE INDEX "listings_seller_id_status_idx" ON "listings"("seller_id", "status");

-- CreateIndex
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at");

-- CreateIndex
CREATE INDEX "listings_brand_model_idx" ON "listings"("brand", "model");

-- CreateIndex
CREATE INDEX "inquiries_listing_id_created_at_idx" ON "inquiries"("listing_id", "created_at");

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

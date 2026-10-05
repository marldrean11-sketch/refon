-- Cart, cart item, and reservation tables for Phase 5 commerce backend.
--
-- Additive only. No existing table, column, or row is touched.
--
-- Inventory model: a ReFon listing is one specific refurbished physical device.
-- A listing is therefore available, reserved by one buyer, or sold — never
-- available in multiples. The schema enforces the parts of that which can be
-- enforced in the database rather than left to application convention:
--
--   * one listing per cart line  -> UNIQUE (cart_id, listing_id)
--   * one live hold per listing -> partial UNIQUE (listing_id) WHERE released_at IS NULL
--   * exactly one cart owner     -> CHECK (user_id IS NOT NULL <> guest_token_hash IS NOT NULL)
--
-- Expiry is represented by setting `released_at`, never by deleting the row. A
-- partial unique index cannot use a volatile predicate such as
-- `expires_at > now()`, so a lapsed reservation would otherwise keep holding the
-- one-slot-per-listing guarantee indefinitely. Lazy release frees the slot the
-- next time that listing is read or reserved.

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_token_hash" CHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "price_snapshot" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "cart_item_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "released_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_token_hash_key" ON "carts"("guest_token_hash");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "carts_guest_token_hash_idx" ON "carts"("guest_token_hash");

-- CreateIndex
-- A listing can appear at most once in a cart. This is what makes holding the
-- same physical device twice unrepresentable rather than merely discouraged.
CREATE UNIQUE INDEX "cart_items_cart_id_listing_id_key" ON "cart_items"("cart_id", "listing_id");

-- CreateIndex
CREATE INDEX "cart_items_listing_id_idx" ON "cart_items"("listing_id");

-- CreateIndex
CREATE INDEX "reservations_listing_id_released_at_idx" ON "reservations"("listing_id", "released_at");

-- CreateIndex
CREATE INDEX "reservations_cart_item_id_idx" ON "reservations"("cart_item_id");

-- CreateIndex
CREATE INDEX "reservations_expires_at_released_at_idx" ON "reservations"("expires_at", "released_at");

-- The core concurrency guarantee: at most one unreleased reservation per listing.
-- A competing insert for a held listing fails with a unique violation, so two
-- buyers cannot both believe they hold the same device.
CREATE UNIQUE INDEX "reservations_active_listing_key"
    ON "reservations"("listing_id")
    WHERE "released_at" IS NULL;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity constraints.
--
-- A cart belongs to exactly one owner. Permitting a row with neither owner would
-- make it unreachable but still counted; permitting both would let a client claim
-- someone else's cart by pairing a user id with a known guest token hash.
ALTER TABLE "carts" ADD CONSTRAINT "carts_single_owner_check"
    CHECK ((user_id IS NOT NULL) <> (guest_token_hash IS NOT NULL));

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_check" CHECK (quantity >= 1);

-- A reservation must expire after it is created, otherwise it would hold a listing
-- forever with no way for it to lapse.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_window_check"
    CHECK (expires_at > created_at);

-- The guest token hash must be a full SHA-256 digest.
ALTER TABLE "carts" ADD CONSTRAINT "carts_guest_token_hash_format_check"
    CHECK (guest_token_hash IS NULL OR guest_token_hash ~ '^[0-9a-f]{64}$');
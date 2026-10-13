-- Orders: one per seller per checkout.
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_UPDATED';

CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(32) NOT NULL,
    "checkout_reference" VARCHAR(32) NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "delivery_fee" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "delivery_method_id" VARCHAR(40) NOT NULL,
    "delivery_label" VARCHAR(120) NOT NULL,
    "payment_method_id" VARCHAR(40) NOT NULL,
    "payment_label" VARCHAR(120) NOT NULL,
    "contact" JSONB NOT NULL,
    "cancel_reason" VARCHAR(500),
    "confirmed_at" TIMESTAMPTZ(3),
    "shipped_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "listing_id" UUID,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "storage" VARCHAR(64) NOT NULL,
    "color" VARCHAR(80),
    "photo" VARCHAR(500),
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "orders_buyer_id_created_at_idx" ON "orders"("buyer_id", "created_at");
CREATE INDEX "orders_seller_id_status_created_at_idx" ON "orders"("seller_id", "status", "created_at");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_listing_id_idx" ON "order_items"("listing_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

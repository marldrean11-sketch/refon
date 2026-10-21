-- Buyers follow phone stores and hear when a followed store lists a new phone.
ALTER TYPE "NotificationType" ADD VALUE 'NEW_FROM_FOLLOWED_STORE';

CREATE TABLE "store_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_follows_user_id_seller_id_key" ON "store_follows"("user_id", "seller_id");
CREATE INDEX "store_follows_seller_id_idx" ON "store_follows"("seller_id");

ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Saved buyer details, account suspension, seller payment details, trade-in requests.
ALTER TABLE "users"
  ADD COLUMN "phone" VARCHAR(20),
  ADD COLUMN "default_address" JSONB,
  ADD COLUMN "suspended_at" TIMESTAMPTZ(3),
  ADD COLUMN "suspended_reason" VARCHAR(500);

ALTER TABLE "sellers"
  ADD COLUMN "payment_gcash" VARCHAR(40),
  ADD COLUMN "payment_maya" VARCHAR(40),
  ADD COLUMN "payment_bank" VARCHAR(300),
  ADD COLUMN "payment_qr" VARCHAR(500),
  ADD COLUMN "payment_note" VARCHAR(300);

CREATE TYPE "TradeInStatus" AS ENUM ('NEW', 'CONTACTED', 'DONE', 'DECLINED');

CREATE TABLE "trade_in_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "contact" VARCHAR(320) NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "answers" JSONB NOT NULL,
    "estimate_low" INTEGER NOT NULL,
    "estimate_high" INTEGER NOT NULL,
    "note" VARCHAR(1000),
    "status" "TradeInStatus" NOT NULL DEFAULT 'NEW',
    "admin_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trade_in_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trade_in_requests_status_created_at_idx" ON "trade_in_requests"("status", "created_at");

ALTER TABLE "trade_in_requests" ADD CONSTRAINT "trade_in_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

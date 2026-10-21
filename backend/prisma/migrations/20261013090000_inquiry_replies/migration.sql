-- Reply threads on inquiries.
ALTER TYPE "NotificationType" ADD VALUE 'INQUIRY_REPLY';

CREATE TABLE "inquiry_replies" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "author_id" UUID,
    "from_seller" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_replies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inquiry_replies_inquiry_id_created_at_idx" ON "inquiry_replies"("inquiry_id", "created_at");

ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

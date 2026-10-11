-- Anonymous booth feedback.
CREATE TYPE "FeedbackWouldBuy" AS ENUM ('YES', 'MAYBE', 'NO');

CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "would_buy" "FeedbackWouldBuy" NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

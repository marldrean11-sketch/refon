-- Anonymous health-check runs for the "phones checked today" counter.
CREATE TABLE "health_check_runs" (
    "id" UUID NOT NULL,
    "passed" SMALLINT NOT NULL DEFAULT 0,
    "completed" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "health_check_runs_counts_check" CHECK ("passed" >= 0 AND "completed" >= "passed" AND "completed" <= 8)
);

CREATE INDEX "health_check_runs_created_at_idx" ON "health_check_runs"("created_at");

-- Booth details the admin can change on fair day (booth number, Viber link).
CREATE TABLE "site_settings" (
    "key" VARCHAR(40) NOT NULL,
    "value" VARCHAR(200) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

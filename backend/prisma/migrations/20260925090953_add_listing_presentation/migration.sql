-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "color" VARCHAR(80),
ADD COLUMN     "cosmetic_condition" VARCHAR(40) NOT NULL DEFAULT 'Good';

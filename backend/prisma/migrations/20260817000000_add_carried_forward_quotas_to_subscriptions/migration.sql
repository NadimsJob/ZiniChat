-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "carriedForwardAiQuota" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "carriedForwardMessageQuota" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "adminStatus" "AdminStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "properties_adminStatus_idx" ON "properties"("adminStatus");

-- CreateIndex
CREATE INDEX "properties_adminStatus_status_idx" ON "properties"("adminStatus", "status");




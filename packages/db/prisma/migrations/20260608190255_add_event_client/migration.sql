-- AlterTable
ALTER TABLE "WaGroup" ADD COLUMN     "eventClientId" TEXT;

-- CreateTable
CREATE TABLE "EventClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventClient_tenantId_idx" ON "EventClient"("tenantId");

-- CreateIndex
CREATE INDEX "WaGroup_eventClientId_idx" ON "WaGroup"("eventClientId");

-- AddForeignKey
ALTER TABLE "EventClient" ADD CONSTRAINT "EventClient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaGroup" ADD CONSTRAINT "WaGroup_eventClientId_fkey" FOREIGN KEY ("eventClientId") REFERENCES "EventClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

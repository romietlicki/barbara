-- Add TENANT_VIEWER to Role enum
ALTER TYPE "Role" ADD VALUE 'TENANT_VIEWER';

-- Add trelloScheduleHours to Tenant
ALTER TABLE "Tenant" ADD COLUMN "trelloScheduleHours" INTEGER NOT NULL DEFAULT 2;

-- Create TrelloExport table
CREATE TABLE "TrelloExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrelloExport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TrelloExport" ADD CONSTRAINT "TrelloExport_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TrelloExport_tenantId_actionText_key" ON "TrelloExport"("tenantId", "actionText");
CREATE INDEX "TrelloExport_tenantId_idx" ON "TrelloExport"("tenantId");

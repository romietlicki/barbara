-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "trelloApiKey" TEXT,
                     ADD COLUMN "trelloToken" TEXT,
                     ADD COLUMN "trelloListId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "taskadeApiKey",
DROP COLUMN IF EXISTS "taskadeProjectId",
ADD COLUMN "taskadeWebhookUrl" TEXT;

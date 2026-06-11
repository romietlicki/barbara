-- AlterTable
ALTER TABLE "EventClient" ADD COLUMN     "digestDayOfMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "digestDayOfWeek" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "digestFrequency" TEXT NOT NULL DEFAULT 'daily';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "digestDayOfMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "digestDayOfWeek" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "digestFrequency" TEXT NOT NULL DEFAULT 'daily';

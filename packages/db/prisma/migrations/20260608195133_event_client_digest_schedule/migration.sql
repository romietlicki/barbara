-- AlterTable
ALTER TABLE "EventClient" ADD COLUMN     "digestTime" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

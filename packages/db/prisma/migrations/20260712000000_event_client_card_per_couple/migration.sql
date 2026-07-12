-- Remove campos do board por-casal (substituídos por trelloCardId)
ALTER TABLE "EventClient" DROP COLUMN IF EXISTS "trelloBoardId";
ALTER TABLE "EventClient" DROP COLUMN IF EXISTS "trelloListId";
ALTER TABLE "EventClient" DROP COLUMN IF EXISTS "trelloBoardUrl";

-- Adiciona ID do card único por casal no board do tenant
ALTER TABLE "EventClient" ADD COLUMN IF NOT EXISTS "trelloCardId" TEXT;

ALTER TABLE "EventClientTrelloExport" ADD COLUMN IF NOT EXISTS "trelloItemId"  TEXT;
ALTER TABLE "EventClientTrelloExport" ADD COLUMN IF NOT EXISTS "checklistName" TEXT;
ALTER TABLE "EventClientTrelloExport" ADD COLUMN IF NOT EXISTS "status"        TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "EventClientTrelloExport" ADD COLUMN IF NOT EXISTS "doneAt"        TIMESTAMP(3);
ALTER TABLE "EventClientTrelloExport" ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "EventClientTrelloExport_eventClientId_status_idx"
  ON "EventClientTrelloExport"("eventClientId", "status");

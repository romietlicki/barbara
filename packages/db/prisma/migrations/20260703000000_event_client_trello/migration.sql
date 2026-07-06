-- Add Trello fields to EventClient
ALTER TABLE "EventClient" ADD COLUMN "trelloBoardId" TEXT;
ALTER TABLE "EventClient" ADD COLUMN "trelloListId"  TEXT;
ALTER TABLE "EventClient" ADD COLUMN "trelloBoardUrl" TEXT;

-- Create EventClientTrelloExport table for per-couple deduplication
CREATE TABLE "EventClientTrelloExport" (
    "id"            TEXT         NOT NULL,
    "tenantId"      TEXT         NOT NULL,
    "eventClientId" TEXT         NOT NULL,
    "actionText"    TEXT         NOT NULL,
    "exportedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventClientTrelloExport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventClientTrelloExport" ADD CONSTRAINT "EventClientTrelloExport_eventClientId_fkey"
    FOREIGN KEY ("eventClientId") REFERENCES "EventClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "EventClientTrelloExport_eventClientId_actionText_key"
    ON "EventClientTrelloExport"("eventClientId", "actionText");

CREATE INDEX "EventClientTrelloExport_eventClientId_idx"
    ON "EventClientTrelloExport"("eventClientId");

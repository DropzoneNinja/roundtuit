CREATE TABLE "AuditLog" (
  "id"            TEXT NOT NULL,
  "action"        TEXT NOT NULL,
  "entity"        TEXT NOT NULL,
  "entityId"      TEXT NOT NULL,
  "actorId"       TEXT NOT NULL,
  "actorUsername" TEXT NOT NULL,
  "detail"        JSONB NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

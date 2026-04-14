-- AlterTable
ALTER TABLE "Module" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "reversibleUntil" DATETIME,
    "reversedAt" DATETIME,
    "reversedBy" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ActionLog_actor_createdAt_idx" ON "ActionLog"("actor", "createdAt");

-- CreateIndex
CREATE INDEX "ActionLog_targetType_targetId_idx" ON "ActionLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ActionLog_reversibleUntil_idx" ON "ActionLog"("reversibleUntil");

-- CreateIndex
CREATE INDEX "ActionLog_reversedAt_idx" ON "ActionLog"("reversedAt");

-- CreateIndex
CREATE INDEX "Module_deletedAt_idx" ON "Module"("deletedAt");

-- CreateIndex
CREATE INDEX "Prompt_deletedAt_idx" ON "Prompt"("deletedAt");

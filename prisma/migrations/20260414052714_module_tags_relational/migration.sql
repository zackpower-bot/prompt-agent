/*
  Warnings:

  - You are about to drop the column `tags` on the `Module` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ModuleTag" (
    "moduleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("moduleId", "tagId"),
    CONSTRAINT "ModuleTag_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModuleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill ModuleTag data from JSON column before dropping it
WITH parsed_tags AS (
    SELECT
        m.id AS moduleId,
        TRIM(json_each.value) AS tagName
    FROM "Module" AS m,
         json_each(m.tags)
    WHERE m.tags IS NOT NULL
      AND json_valid(m.tags)
)
INSERT OR IGNORE INTO "Tag" ("id", "name")
SELECT lower(hex(randomblob(16))), pt.tagName
FROM (
    SELECT DISTINCT tagName
    FROM parsed_tags
    WHERE tagName IS NOT NULL
      AND tagName != ''
) AS pt
;

WITH parsed_tags AS (
    SELECT
        m.id AS moduleId,
        TRIM(json_each.value) AS tagName
    FROM "Module" AS m,
         json_each(m.tags)
    WHERE m.tags IS NOT NULL
      AND json_valid(m.tags)
)
INSERT OR IGNORE INTO "ModuleTag" ("moduleId", "tagId")
SELECT mt.moduleId, t.id
FROM (
    SELECT DISTINCT moduleId, tagName
    FROM parsed_tags
    WHERE tagName IS NOT NULL
      AND tagName != ''
) AS mt
JOIN "Tag" AS t ON t.name = mt.tagName;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'role',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Module" ("content", "createdAt", "id", "title", "type", "updatedAt") SELECT "content", "createdAt", "id", "title", "type", "updatedAt" FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Module" RENAME TO "Module";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

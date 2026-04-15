ALTER TABLE "Module" ADD COLUMN "slot" TEXT;

UPDATE "Module" SET "slot" = 'role'        WHERE "slot" IS NULL AND "type" = 'role';
UPDATE "Module" SET "slot" = 'task'        WHERE "slot" IS NULL AND "type" = 'goal';
UPDATE "Module" SET "slot" = 'constraints' WHERE "slot" IS NULL AND "type" = 'constraint';
UPDATE "Module" SET "slot" = 'output'      WHERE "slot" IS NULL AND "type" = 'output_format';
UPDATE "Module" SET "slot" = 'checks'      WHERE "slot" IS NULL AND "type" = 'self_check';
UPDATE "Module" SET "slot" = 'context'     WHERE "slot" IS NULL AND "type" = 'context';
UPDATE "Module" SET "slot" = 'examples'    WHERE "slot" IS NULL AND "type" = 'example';
UPDATE "Module" SET "slot" = 'process'     WHERE "slot" IS NULL AND "type" = 'process';
UPDATE "Module" SET "slot" = 'tools'       WHERE "slot" IS NULL AND "type" = 'tool';
UPDATE "Module" SET "slot" = 'state'       WHERE "slot" IS NULL AND "type" = 'state';
UPDATE "Module" SET "slot" = 'variables'   WHERE "slot" IS NULL AND "type" = 'variable';

CREATE INDEX "Module_slot_idx" ON "Module"("slot");

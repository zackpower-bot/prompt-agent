import "dotenv/config"

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"
import { createModule, getModules, deleteModule } from "../src/app/actions/module.actions"
import { reverseActionById } from "../src/app/actions/activity.actions"
import type { ModuleWithMeta } from "../src/app/actions/module.actions"

function assert(
  condition: unknown,
  message: string,
  context?: Record<string, unknown>
): asserts condition {
  if (condition) return
  console.error(`[smoke-action-log] Assertion failed: ${message}`)
  if (context) console.error(context)
  throw new Error(message)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for smoke-action-log")
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  let testModuleId: string | null = null
  let actionLogId: string | null = null

  try {
    const createResult = await createModule({
      title: "smoke-soft-delete",
      content: "x",
      type: "role",
    })
    assert(createResult.success, "createModule failed", createResult as any)
    const moduleId = createResult.data.id
    testModuleId = moduleId
    console.log(`[smoke-action-log] Created module ${moduleId}`)

    const deleteResult = await deleteModule(moduleId)
    assert(deleteResult.success, "deleteModule failed", deleteResult as any)
    actionLogId = deleteResult.actionLogId
    console.log(`[smoke-action-log] Soft-deleted module ${moduleId} with log ${actionLogId}`)

    const activeModules = await ensureModules(await getModules(), "getModules failed")
    assert(!activeModules.some((m) => m.id === moduleId), "Deleted module still present in default listing")

    const trashedModules = await ensureModules(await getModules({ includeTrashed: true }), "getModules(includeTrashed) failed")
    const trashed = trashedModules.find((m) => m.id === moduleId)
    assert(trashed, "Trashed module missing from includeTrashed listing")
    assert(trashed?.deletedAt, "Trashed module missing deletedAt timestamp", trashed as any)

    assert(actionLogId, "Missing actionLogId for undo")
    const undoResult = await reverseActionById(actionLogId)
    assert(undoResult.success, "reverseActionById failed", undoResult as any)
    console.log(`[smoke-action-log] Undo succeeded for ${actionLogId}`)

    const modulesAfterUndo = await ensureModules(await getModules(), "getModules after undo failed")
    const restored = modulesAfterUndo.find((m) => m.id === moduleId)
    assert(restored && !restored.deletedAt, "Module not restored after undo", restored as any)

    const undoAgain = await reverseActionById(actionLogId)
    assert(
      !undoAgain.success && undoAgain.error === "already_reversed",
      "Second undo should report already_reversed",
      undoAgain as any
    )

    console.log("[smoke-action-log] OK")
  } finally {
    if (actionLogId) {
      await prisma.actionLog
        .delete({ where: { id: actionLogId } })
        .catch((err) => console.error("[smoke-action-log] Failed to delete ActionLog", err))
    }
    if (testModuleId) {
      await prisma.module
        .delete({ where: { id: testModuleId } })
        .catch((err) => console.error("[smoke-action-log] Failed to hard-delete module", err))
    }
    await prisma.$disconnect()
  }
}

async function ensureModules(
  result: Awaited<ReturnType<typeof getModules>>,
  message: string
): Promise<ModuleWithMeta[]> {
  assert(result.success, message, result as any)
  return result.data
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

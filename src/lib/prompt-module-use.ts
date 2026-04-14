import type { Prompt } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

function uniqModuleIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export async function recordPromptModuleUse(promptId: string, moduleIds: string[]): Promise<void> {
  const orderedIds = uniqModuleIds(moduleIds)
  await prisma.$transaction(async (tx) => {
    if (!orderedIds.length) {
      await tx.promptModuleUse.deleteMany({ where: { promptId } })
      return
    }
    await tx.promptModuleUse.deleteMany({
      where: {
        promptId,
        moduleId: { notIn: orderedIds },
      },
    })
    for (let index = 0; index < orderedIds.length; index++) {
      const moduleId = orderedIds[index]
      await tx.promptModuleUse.upsert({
        where: { promptId_moduleId: { promptId, moduleId } },
        update: { order: index },
        create: { promptId, moduleId, order: index },
      })
    }
  })
}

export async function getPromptsUsingModule(moduleId: string): Promise<Prompt[]> {
  return prisma.prompt.findMany({
    where: {
      moduleUses: { some: { moduleId } },
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  })
}

"use server"

import { prisma } from "@/lib/prisma"

export interface VersionWithMeta {
  id: string
  versionNumber: number
  title: string
  content: string
  createdAt: string
}

function serializeVersion(row: any): VersionWithMeta {
  return {
    id: row.id,
    versionNumber: row.versionNumber,
    title: row.title,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function createVersion(promptId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } })
    if (!prompt) return { success: false, error: "Prompt not found" }

    const lastVersion = await prisma.promptVersion.findFirst({
      where: { promptId },
      orderBy: { versionNumber: "desc" },
    })

    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1

    await prisma.promptVersion.create({
      data: {
        promptId,
        versionNumber: nextNumber,
        title: prompt.title,
        content: prompt.content,
        snapshot: JSON.stringify({
          title: prompt.title,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          model: prompt.model,
          status: prompt.status,
        }),
      },
    })

    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getVersions(promptId: string): Promise<{ success: true; data: VersionWithMeta[] } | { success: false; error: string }> {
  try {
    const rows = await prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { versionNumber: "desc" },
    })
    return { success: true, data: rows.map(serializeVersion) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

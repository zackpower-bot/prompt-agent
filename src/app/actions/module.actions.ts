"use server"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { embedModuleAsync } from "@/lib/embedding"
import { recordAction } from "@/lib/action-log"
import { isValidSlot, type Slot } from "@/lib/slots"

export interface ModuleWithMeta {
  id: string
  title: string
  content: string
  type: string
  slot: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

const moduleWithTagsInclude = {
  tags: {
    include: { tag: true },
  },
} as const

type TxClient = Prisma.TransactionClient
type TagRecord = { id: string; name: string }

function serializeModule(row: any): ModuleWithMeta {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    slot: row.slot ?? null,
    tags: Array.isArray(row.tags) ? row.tags.map((t: any) => t.tag?.name ?? "").filter(Boolean) : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  }
}

function normalizeTagNames(tags?: string[]) {
  if (!tags) return []
  const seen = new Set<string>()
  for (const raw of tags) {
    const trimmed = raw?.trim()
    if (trimmed && !seen.has(trimmed)) seen.add(trimmed)
  }
  return Array.from(seen)
}

async function upsertTags(tx: TxClient, tagNames: string[]): Promise<TagRecord[]> {
  if (!tagNames.length) return []
  return Promise.all(
    tagNames.map((name) =>
      tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  )
}

export async function getModules(filters?: {
  type?: string
  search?: string
  includeTrashed?: boolean
}): Promise<{ success: true; data: ModuleWithMeta[] } | { success: false; error: string }> {
  try {
    const where: any = {}
    if (!filters?.includeTrashed) where.deletedAt = null
    if (filters?.type && filters.type !== "all") where.type = filters.type
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
      ]
    }
    const rows = await prisma.module.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: moduleWithTagsInclude,
    })
    return { success: true, data: rows.map(serializeModule) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getModulesPaginated(params?: {
  type?: string
  search?: string
  includeTrashed?: boolean
  limit?: number
  offset?: number
}): Promise<
  | { success: true; data: ModuleWithMeta[]; total: number; limit: number; offset: number }
  | { success: false; error: string }
> {
  try {
    const where: Prisma.ModuleWhereInput = {}
    if (!params?.includeTrashed) where.deletedAt = null
    if (params?.type && params.type !== "all") where.type = params.type
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search } },
        { content: { contains: params.search } },
      ]
    }

    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0

    const [rows, total] = await Promise.all([
      prisma.module.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: moduleWithTagsInclude,
        take: limit,
        skip: offset,
      }),
      prisma.module.count({ where }),
    ])

    return {
      success: true,
      data: rows.map(serializeModule),
      total,
      limit,
      offset,
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createModule(input: {
  title: string
  content: string
  type: string
  slot?: Slot | null
  tags?: string[]
}): Promise<{ success: true; data: ModuleWithMeta } | { success: false; error: string }> {
  try {
    const tagNames = normalizeTagNames(input.tags)
    const row = await prisma.$transaction(async (tx) => {
      const tags = await upsertTags(tx, tagNames)
      return tx.module.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          slot: input.slot ?? null,
          tags: tags.length
            ? {
                create: tags.map((tag) => ({
                  tag: { connect: { id: tag.id } },
                })),
              }
            : undefined,
        },
        include: moduleWithTagsInclude,
      })
    })
    void embedModuleAsync(row.id)
    return { success: true, data: serializeModule(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateModule(
  id: string,
  input: Partial<{ title: string; content: string; type: string; slot: Slot | null; tags: string[] }>
): Promise<{ success: true; data: ModuleWithMeta } | { success: false; error: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.module.findUnique({
        where: { id },
        select: { id: true, title: true, content: true, deletedAt: true },
      })
      if (!existing) throw new Error("Module not found")
      if (existing.deletedAt) throw new Error("Module deleted")

      let shouldEmbed = false
      if (input.title !== undefined && input.title !== existing.title) shouldEmbed = true
      if (input.content !== undefined && input.content !== existing.content) shouldEmbed = true

      const data: Prisma.ModuleUpdateInput = {}
      if (input.title !== undefined) data.title = input.title
      if (input.content !== undefined) data.content = input.content
      if (input.type !== undefined) data.type = input.type
      if (input.slot !== undefined) data.slot = input.slot

      if (Object.keys(data).length) {
        await tx.module.update({ where: { id }, data })
      }

      if (input.tags !== undefined) {
        const tagNames = normalizeTagNames(input.tags)
        const tags = await upsertTags(tx, tagNames)
        await tx.moduleTag.deleteMany({ where: { moduleId: id } })
        if (tags.length) {
          await tx.moduleTag.createMany({
            data: tags.map((tag) => ({ moduleId: id, tagId: tag.id })),
          })
        }
      }

      const module = await tx.module.findUnique({
        where: { id },
        include: moduleWithTagsInclude,
      })
      if (!module) throw new Error("Module not found")
      return { module, shouldEmbed }
    })
    if (result.shouldEmbed) {
      void embedModuleAsync(result.module.id)
    }
    return { success: true, data: serializeModule(result.module) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deleteModule(
  id: string
): Promise<{ success: true; actionLogId: string } | { success: false; error: string }> {
  try {
    const existing = await prisma.module.findUnique({
      where: { id },
      include: moduleWithTagsInclude,
    })
    if (!existing) return { success: false, error: "Module not found" }
    if (existing.deletedAt) return { success: false, error: "Module already deleted" }

    const before = serializeModule(existing)
    const deletedAt = new Date()
    const updated = await prisma.module.update({
      where: { id },
      data: { deletedAt },
      include: moduleWithTagsInclude,
    })
    const after = serializeModule(updated)
    const log = await recordAction({
      actor: "user",
      action: "soft_delete",
      targetType: "module",
      targetId: id,
      before,
      after,
    })
    return { success: true, actionLogId: log.id }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function normalizeModuleSlot(value: string | null | undefined): Slot | null {
  return isValidSlot(value) ? value : null
}

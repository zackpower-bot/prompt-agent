import { prisma } from "@/lib/prisma"

export type EntityType = "prompt" | "module" | "recipe"
export type UsageAction = "execute" | "test_run" | "assemble" | "copy" | "reference"

export interface UsageStats {
  total: number
  last24h: number
  last7d: number
  last30d: number
  lastUsedAt: string | null
  byAction: { action: UsageAction; count: number }[]
}

export interface TopEntity {
  entityType: EntityType
  entityId: string
  count: number
  lastUsedAt: string
}

export async function recordEntityUsage(input: {
  entityType: EntityType
  entityId: string
  action: UsageAction
  context?: string
}): Promise<void> {
  try {
    await prisma.entityUsage.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        context: input.context ?? null,
      },
    })
  } catch (error) {
    console.error("recordEntityUsage failed", error)
  }
}

export async function getUsageForEntity(
  entityType: EntityType,
  entityId: string
): Promise<UsageStats> {
  const now = new Date()
  const last24hFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7dFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30dFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const where = { entityType, entityId }
  const [total, last24h, last7d, last30d, byAction, latest] = await Promise.all([
    prisma.entityUsage.count({ where }),
    prisma.entityUsage.count({ where: { ...where, createdAt: { gte: last24hFrom } } }),
    prisma.entityUsage.count({ where: { ...where, createdAt: { gte: last7dFrom } } }),
    prisma.entityUsage.count({ where: { ...where, createdAt: { gte: last30dFrom } } }),
    prisma.entityUsage.groupBy({
      by: ["action"],
      where,
      _count: { _all: true },
    }),
    prisma.entityUsage.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ])

  return {
    total,
    last24h,
    last7d,
    last30d,
    lastUsedAt: latest?.createdAt.toISOString() ?? null,
    byAction: byAction.map((row) => ({
      action: row.action as UsageAction,
      count: row._count._all,
    })),
  }
}

export async function getTopUsedEntities(
  entityType: EntityType,
  limit = 20
): Promise<TopEntity[]> {
  const grouped = await prisma.entityUsage.groupBy({
    by: ["entityId", "entityType"],
    where: { entityType },
    _count: { _all: true },
    _max: { createdAt: true },
  })

  return grouped
    .filter((row) => row._max.createdAt)
    .sort((a, b) => {
      if (b._count._all !== a._count._all) return b._count._all - a._count._all
      return b._max.createdAt!.getTime() - a._max.createdAt!.getTime()
    })
    .slice(0, limit)
    .map((row) => ({
      entityType: row.entityType as EntityType,
      entityId: row.entityId,
      count: row._count._all,
      lastUsedAt: row._max.createdAt!.toISOString(),
    }))
}

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type ActionType = "soft_delete"
export type TargetType = "prompt" | "module"
export type ActorType = "user" | "agent"
export type ReversalActor = "user" | "system"

export interface ActionLogRow {
  id: string
  actor: ActorType
  action: ActionType
  targetType: TargetType
  targetId: string
  before: unknown
  after: unknown
  reason: string | null
  reversibleUntil: string | null
  reversedAt: string | null
  reversedBy: ReversalActor | null
  createdAt: string
}

const DEFAULT_REVERSIBLE_DAYS = 30

function serializeRow(row: any): ActionLogRow {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    before: safeJsonParse(row.before),
    after: safeJsonParse(row.after),
    reason: row.reason ?? null,
    reversibleUntil: row.reversibleUntil ? row.reversibleUntil.toISOString() : null,
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    reversedBy: row.reversedBy ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function safeJsonParse(payload: string | null): unknown {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

export async function recordAction(input: {
  actor: ActorType
  action: ActionType
  targetType: TargetType
  targetId: string
  before: unknown
  after: unknown
  reason?: string
  reversibleDays?: number | null
}): Promise<{ id: string }> {
  const reversibleDays =
    input.reversibleDays === undefined ? DEFAULT_REVERSIBLE_DAYS : input.reversibleDays ?? 0
  const reversibleUntil =
    reversibleDays > 0 ? new Date(Date.now() + reversibleDays * 24 * 60 * 60 * 1000) : null

  const row = await prisma.actionLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: JSON.stringify(input.before ?? null),
      after: JSON.stringify(input.after ?? null),
      reason: input.reason ?? null,
      reversibleUntil,
    },
    select: { id: true },
  })
  return row
}

export async function listActions(filters?: {
  actor?: ActorType
  targetType?: TargetType
  targetId?: string
  reversibleOnly?: boolean
  limit?: number
  offset?: number
}): Promise<ActionLogRow[]> {
  const where: Prisma.ActionLogWhereInput = {}
  if (filters?.actor) where.actor = filters.actor
  if (filters?.targetType) where.targetType = filters.targetType
  if (filters?.targetId) where.targetId = filters.targetId
  if (filters?.reversibleOnly) {
    where.reversibleUntil = { gt: new Date() }
    where.reversedAt = null
  }

  const rows = await prisma.actionLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
  })
  return rows.map(serializeRow)
}

export async function reverseAction(
  logId: string,
  reversedBy: ReversalActor
): Promise<{ success: boolean; error?: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.actionLog.findUnique({ where: { id: logId } })
    if (!log) return { success: false as const, error: "not_found" }
    if (log.reversedAt) return { success: false as const, error: "already_reversed" }
    if (!log.reversibleUntil || log.reversibleUntil.getTime() <= Date.now()) {
      return { success: false as const, error: "window_expired" }
    }

    if (log.action === "soft_delete") {
      const delegate = getTargetDelegate(tx, log.targetType as TargetType)
      if (!delegate) throw new Error(`Unsupported target type: ${log.targetType}`)
      try {
        await delegate.update({
          where: { id: log.targetId },
          data: { deletedAt: null },
        })
      } catch (error) {
        if (isPrismaNotFoundError(error)) {
          return { success: false as const, error: "target_missing" }
        }
        throw error
      }
    } else {
      throw new Error(`Reversal not implemented for action: ${log.action}`)
    }

    await tx.actionLog.update({
      where: { id: log.id },
      data: { reversedAt: new Date(), reversedBy },
    })
    return { success: true as const }
  })
  return result
}

function getTargetDelegate(
  tx: Prisma.TransactionClient,
  targetType: TargetType
): { update: (args: any) => Promise<unknown> } | null {
  switch (targetType) {
    case "prompt":
      return tx.prompt
    case "module":
      return tx.module
    default:
      return null
  }
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

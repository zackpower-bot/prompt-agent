import { prisma } from "@/lib/prisma"

export const TAVILY_QUOTA_WARNING_THRESHOLD = 0.9

export type TavilyMonthlyUsage = {
  monthlyLimit: number
  usedThisMonth: number
  remaining: number
  percentUsed: number
  resetAt: string
}

function resolveMonthlyLimit(): number {
  const raw = process.env.TAVILY_MONTHLY_LIMIT
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return 1000
}

export function getUtcMonthRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return { start, end }
}

export async function getTavilyMonthlyUsage(now = new Date()): Promise<TavilyMonthlyUsage> {
  const { start, end } = getUtcMonthRange(now)
  const monthlyLimit = resolveMonthlyLimit()
  const monthlyAggregate = await prisma.usageLog.aggregate({
    where: {
      service: "tavily",
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    _sum: { requestCount: true },
  })

  const usedThisMonth = monthlyAggregate._sum.requestCount ?? 0
  const remaining = Math.max(0, monthlyLimit - usedThisMonth)
  const percentUsed = monthlyLimit > 0 ? Math.min(1, Math.max(0, usedThisMonth / monthlyLimit)) : 1

  return {
    monthlyLimit,
    usedThisMonth,
    remaining,
    percentUsed,
    resetAt: end.toISOString(),
  }
}

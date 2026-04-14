import { prisma } from "@/lib/prisma"

export const TAVILY_QUOTA_ALERT_TYPE = "tavily_quota"
export const TAVILY_QUOTA_WARNING_THRESHOLD = 0.9

export function resolveMonthlyLimit(): number {
  const raw = process.env.TAVILY_MONTHLY_LIMIT
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return 1000
}

export function firstOfMonthUTC(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function startOfNextMonthUTC(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

export type TavilyUsageSnapshot = {
  usedThisMonth: number
  monthlyLimit: number
  remaining: number
  percentUsed: number
  resetAt: Date
}

export async function getTavilyUsage(now = new Date()): Promise<TavilyUsageSnapshot> {
  const rangeStart = firstOfMonthUTC(now)
  const rangeEnd = startOfNextMonthUTC(now)
  const monthlyLimit = resolveMonthlyLimit()
  const aggregate = await prisma.usageLog.aggregate({
    where: {
      service: "tavily",
      success: true,
      createdAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    _sum: { requestCount: true },
  })

  const usedThisMonth = aggregate._sum.requestCount ?? 0
  const remaining = Math.max(0, monthlyLimit - usedThisMonth)
  const percentUsed = monthlyLimit > 0 ? usedThisMonth / monthlyLimit : 1

  return {
    usedThisMonth,
    monthlyLimit,
    remaining,
    percentUsed,
    resetAt: rangeEnd,
  }
}

export async function checkTavilyQuota(now = new Date()): Promise<void> {
  const usage = await getTavilyUsage(now)
  if (usage.percentUsed < TAVILY_QUOTA_WARNING_THRESHOLD) return

  const severity = usage.percentUsed >= 1 ? "critical" : "warning"
  const rangeStart = firstOfMonthUTC(now)
  const rangeEnd = startOfNextMonthUTC(now)

  const existing = await prisma.alert.findFirst({
    where: {
      type: TAVILY_QUOTA_ALERT_TYPE,
      acknowledged: false,
      createdAt: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return

  const percent = Math.round(usage.percentUsed * 100)
  const message =
    severity === "critical"
      ? "Tavily usage exceeded the monthly limit."
      : `Tavily usage reached ${percent}% of the monthly limit.`

  await prisma.alert.create({
    data: {
      type: TAVILY_QUOTA_ALERT_TYPE,
      severity,
      message,
      metadata: JSON.stringify({
        monthlyLimit: usage.monthlyLimit,
        usedThisMonth: usage.usedThisMonth,
        remaining: usage.remaining,
        percentUsed: Number(usage.percentUsed.toFixed(4)),
        resetAt: usage.resetAt.toISOString(),
      }),
    },
  })
}

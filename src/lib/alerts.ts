import { prisma } from "@/lib/prisma"
import { getTavilyMonthlyUsage, getUtcMonthRange, TAVILY_QUOTA_WARNING_THRESHOLD } from "@/lib/quota"

export const TAVILY_QUOTA_TYPE = "tavily_quota"

export function parseAlertMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export async function maybeEmitTavilyQuotaAlert(): Promise<void> {
  try {
    const now = new Date()
    const usage = await getTavilyMonthlyUsage(now)
    if (usage.percentUsed < TAVILY_QUOTA_WARNING_THRESHOLD) return

    const { start, end } = getUtcMonthRange(now)
    const existing = await prisma.alert.findFirst({
      where: {
        type: TAVILY_QUOTA_TYPE,
        acknowledged: false,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: "desc" },
    })
    if (existing) return

    await prisma.alert.create({
      data: {
        type: TAVILY_QUOTA_TYPE,
        severity: "warning",
        message: "Tavily quota usage exceeded the warning threshold.",
        metadata: JSON.stringify({
          monthlyLimit: usage.monthlyLimit,
          usedThisMonth: usage.usedThisMonth,
          remaining: usage.remaining,
          percentUsed: Number(usage.percentUsed.toFixed(4)),
          resetAt: usage.resetAt,
        }),
      },
    })
  } catch (error) {
    console.warn("[alerts]", error)
  }
}

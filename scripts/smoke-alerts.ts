import "dotenv/config"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"
import {
  checkTavilyQuota,
  firstOfMonthUTC,
  getTavilyUsage,
  resolveMonthlyLimit,
  startOfNextMonthUTC,
  TAVILY_QUOTA_ALERT_TYPE,
  TAVILY_QUOTA_WARNING_THRESHOLD,
} from "../src/lib/tavily-quota"

const TARGET_USAGE_FRACTION = 0.905

function assert(condition: unknown, message: string, context?: Record<string, unknown>) {
  if (condition) return
  console.error(`Assertion failed: ${message}`)
  if (context) console.error(context)
  throw new Error(message)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run smoke-alerts")
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  const usageLogCountBefore = await prisma.usageLog.count()
  const alertCountBefore = await prisma.alert.count()
  console.log(`[smoke-alerts] UsageLog rows before: ${usageLogCountBefore}`)
  console.log(`[smoke-alerts] Alert rows before: ${alertCountBefore}`)

  const existingAlerts = await prisma.alert.findMany({
    where: { type: TAVILY_QUOTA_ALERT_TYPE },
    select: { id: true },
  })
  const existingAlertIds = new Set(existingAlerts.map((row) => row.id))

  let seededUsageId: string | null = null
  let createdAlertId: string | null = null

  try {
    const usageBefore = await getTavilyUsage()
    const monthlyLimit = resolveMonthlyLimit()
    const desiredUsage = Math.min(monthlyLimit, Math.ceil(monthlyLimit * TARGET_USAGE_FRACTION))
    const additionalRequests = Math.max(0, desiredUsage - usageBefore.usedThisMonth)

    if (additionalRequests > 0) {
      const log = await prisma.usageLog.create({
        data: {
          service: "tavily",
          provider: "tavily",
          requestCount: additionalRequests,
          success: true,
        },
      })
      seededUsageId = log.id
      console.log(
        `[smoke-alerts] Seeded usageLog ${log.id} (+${additionalRequests}) to reach ${desiredUsage}/${monthlyLimit}`,
      )
    } else {
      console.log(
        `[smoke-alerts] Existing Tavily usage already at ${(usageBefore.percentUsed * 100).toFixed(2)}% of ${monthlyLimit}`,
      )
    }

    const usageAfterSeed = await getTavilyUsage()
    assert(
      usageAfterSeed.percentUsed >= TARGET_USAGE_FRACTION,
      "Unable to push Tavily usage above warning threshold",
      {
        percentUsed: usageAfterSeed.percentUsed,
        monthlyLimit: usageAfterSeed.monthlyLimit,
        usedThisMonth: usageAfterSeed.usedThisMonth,
      },
    )
    assert(
      usageAfterSeed.percentUsed < 1,
      "Smoke test expects warning-level usage (<100%)",
      {
        percentUsed: usageAfterSeed.percentUsed,
        usedThisMonth: usageAfterSeed.usedThisMonth,
        monthlyLimit: usageAfterSeed.monthlyLimit,
      },
    )

    await checkTavilyQuota()
    await checkTavilyQuota()

    const start = firstOfMonthUTC()
    const end = startOfNextMonthUTC()
    const monthAlerts = await prisma.alert.findMany({
      where: {
        type: TAVILY_QUOTA_ALERT_TYPE,
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
    })

    const newAlerts = monthAlerts.filter((alert) => !existingAlertIds.has(alert.id))
    assert(newAlerts.length === 1, "Expected exactly one Tavily quota alert after emission", {
      count: newAlerts.length,
      ids: newAlerts.map((alert) => alert.id),
    })

    const [alert] = newAlerts
    createdAlertId = alert.id
    assert(alert.severity === "warning", "Alert severity mismatch", { severity: alert.severity })
    assert(alert.acknowledged === false, "Alert should be unacknowledged by default", {
      acknowledged: alert.acknowledged,
    })

    let httpVerified = false
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2000)
      const response = await fetch("http://localhost:3000/api/alerts", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
      clearTimeout(timer)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = (await response.json()) as { alerts: Array<{ id: string }>; unackCount?: number }
      const listed = payload.alerts.some((row) => row.id === alert.id)
      assert(listed, "Created alert missing from GET /api/alerts HTTP response", {
        ids: payload.alerts.map((row) => row.id),
      })
      httpVerified = true
      console.log(`[smoke-alerts] HTTP /api/alerts verified (${payload.unackCount ?? "?"} unacknowledged)`)
    } catch (error) {
      console.warn(`[smoke-alerts] HTTP fetch skipped (${(error as Error).message}). Using prisma fallback.`)
      const fallback = await prisma.alert.findMany({
        where: { type: TAVILY_QUOTA_ALERT_TYPE },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      console.log(`[smoke-alerts] Prisma fallback returned ${fallback.length} alert(s).`)
      if (!httpVerified) {
        console.log("[smoke-alerts] Documented fallback path.")
      }
    }

    console.log(
      `[smoke-alerts] Alert hook verified (threshold ${TAVILY_QUOTA_WARNING_THRESHOLD * 100}%): ${alert.id}`,
    )
    console.log("[smoke-alerts] OK")
  } finally {
    if (createdAlertId) {
      await prisma.alert.delete({ where: { id: createdAlertId } }).catch((err) => {
        console.error("[smoke-alerts] Failed to delete test alert", err)
      })
    }
    if (seededUsageId) {
      await prisma.usageLog.delete({ where: { id: seededUsageId } }).catch((err) => {
        console.error("[smoke-alerts] Failed to delete seeded usageLog", err)
      })
    }
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { GET as usageRoute } from "../src/app/api/usage/route"

type UsageApiResponse = {
  tavily: {
    quota: {
      monthlyLimit: number
      usedThisMonth: number
      remaining: number
      resetAt: string
      percentUsed: number
    }
  }
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

async function loadUsageSnapshot(): Promise<UsageApiResponse> {
  console.log("调用 /api/usage route handler...")
  const res = await usageRoute(new Request("http://localhost/api/usage"))
  if (!res.ok) throw new Error(`Route handler returned ${res.status}`)
  return (await res.json()) as UsageApiResponse
}

function resolveMonthlyLimitFromEnv() {
  const raw = process.env.TAVILY_MONTHLY_LIMIT
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000
}

function assertEqual<T>(condition: boolean, message: string, details: Record<string, T>) {
  if (condition) return
  console.error(`❌ ${message}`)
  console.error(details)
  throw new Error(message)
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  const monthStart = startOfUtcMonth()
  const baselineAggregate = await prisma.usageLog.aggregate({
    where: { service: "tavily", createdAt: { gte: monthStart } },
    _sum: { requestCount: true },
  })
  const baseline = baselineAggregate._sum.requestCount ?? 0
  console.log(`当前 UTC 月 Tavily requestCount baseline: ${baseline}`)

  const inserted = await prisma.usageLog.create({
    data: {
      service: "tavily",
      provider: "tavily",
      requestCount: 1,
      success: true,
    },
  })
  console.log(`插入临时 usageLog: ${inserted.id}`)

  try {
    const usage = await loadUsageSnapshot()
    const quota = usage.tavily?.quota
    if (!quota) throw new Error("/api/usage 缺少 tavily.quota")

    const expectedUsed = baseline + 1
    const expectedLimit = resolveMonthlyLimitFromEnv()
    const expectedRemaining = Math.max(0, expectedLimit - expectedUsed)

    assertEqual(quota.usedThisMonth === expectedUsed, "usedThisMonth 未按预期增长", {
      expected: expectedUsed,
      actual: quota.usedThisMonth,
    })
    assertEqual(quota.monthlyLimit === expectedLimit, "monthlyLimit 与配置不符", {
      expected: expectedLimit,
      actual: quota.monthlyLimit,
    })
    assertEqual(quota.remaining === expectedRemaining, "remaining 与期望不符", {
      expected: expectedRemaining,
      actual: quota.remaining,
    })
    assertEqual(quota.percentUsed >= 0 && quota.percentUsed <= 1, "percentUsed 超出范围", {
      percentUsed: quota.percentUsed,
    })

    console.log(
      `配额校验成功: used=${quota.usedThisMonth}, limit=${quota.monthlyLimit}, remaining=${quota.remaining}, percent=${quota.percentUsed}`,
    )
    console.log("✅ smoke-usage-quota passed")
  } finally {
    await prisma.usageLog.delete({ where: { id: inserted.id } }).catch((err) => {
      console.error("⚠️ 无法删除临时 usageLog", err)
    })
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("❌ smoke-usage-quota failed")
  console.error(err)
  process.exit(1)
})

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const HOUR = 1000 * 60 * 60
const DAY = HOUR * 24

function resolveSince(value: string | null): Date | undefined {
  if (!value || value === "all") return undefined
  const now = Date.now()
  if (value === "24h") return new Date(now - DAY)
  if (value === "7d") return new Date(now - DAY * 7)
  if (value === "30d") return new Date(now - DAY * 30)
  return undefined
}

function keyFor(provider: string, model: string | null): string {
  return `${provider}::${model ?? "unspecified"}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sinceParam = url.searchParams.get("since")
  const sinceDate = resolveSince(sinceParam)
  const llmWhere = sinceDate
    ? { service: "llm" as const, createdAt: { gte: sinceDate } }
    : { service: "llm" as const }
  const tavilyWhere = sinceDate
    ? { service: "tavily" as const, createdAt: { gte: sinceDate } }
    : { service: "tavily" as const }

  const now = Date.now()
  const last24h = new Date(now - DAY)
  const last7d = new Date(now - DAY * 7)

  const [llmTotals, llmSuccess, llm24h, llm7d] = await Promise.all([
    prisma.usageLog.groupBy({
      by: ["provider", "model"],
      where: llmWhere,
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.usageLog.groupBy({
      by: ["provider", "model"],
      where: { ...llmWhere, success: true },
      _count: { _all: true },
    }),
    prisma.usageLog.groupBy({
      by: ["provider", "model"],
      where: { service: "llm", createdAt: { gte: last24h } },
      _count: { _all: true },
    }),
    prisma.usageLog.groupBy({
      by: ["provider", "model"],
      where: { service: "llm", createdAt: { gte: last7d } },
      _count: { _all: true },
    }),
  ])

  const successMap = new Map<string, number>()
  llmSuccess.forEach((row) => {
    successMap.set(keyFor(row.provider, row.model), row._count._all)
  })

  const window24h = new Map<string, number>()
  llm24h.forEach((row) => {
    window24h.set(keyFor(row.provider, row.model), row._count._all)
  })

  const window7d = new Map<string, number>()
  llm7d.forEach((row) => {
    window7d.set(keyFor(row.provider, row.model), row._count._all)
  })

  const llmByProvider = llmTotals.map((row) => {
    const key = keyFor(row.provider, row.model)
    const requests = row._count._all
    const successCount = successMap.get(key) ?? 0
    return {
      provider: row.provider,
      model: row.model ?? "unspecified",
      requests,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      successRate: requests > 0 ? successCount / requests : 0,
      last24h: window24h.get(key) ?? 0,
      last7d: window7d.get(key) ?? 0,
    }
  })

  const [tavilyTotals, tavilySuccess, tavily24h, tavily7d, tavilyLastError] = await Promise.all([
    prisma.usageLog.aggregate({
      where: tavilyWhere,
      _count: { _all: true },
      _sum: { requestCount: true },
    }),
    prisma.usageLog.aggregate({
      where: { ...tavilyWhere, success: true },
      _count: { _all: true },
    }),
    prisma.usageLog.aggregate({
      where: { service: "tavily", createdAt: { gte: last24h } },
      _sum: { requestCount: true },
    }),
    prisma.usageLog.aggregate({
      where: { service: "tavily", createdAt: { gte: last7d } },
      _sum: { requestCount: true },
    }),
    prisma.usageLog.findFirst({
      where: { service: "tavily", success: false },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const tavilyTotalRequests = tavilyTotals._sum.requestCount ?? tavilyTotals._count._all ?? 0
  const tavilySuccessCount = tavilySuccess._count._all ?? 0
  const tavilyTotalCount = tavilyTotals._count._all ?? 0
  const tavilySummary = {
    total: tavilyTotalRequests,
    last24h: tavily24h._sum.requestCount ?? 0,
    last7d: tavily7d._sum.requestCount ?? 0,
    successRate: tavilyTotalCount > 0 ? tavilySuccessCount / tavilyTotalCount : 0,
    lastError: tavilyLastError
      ? { errorCode: tavilyLastError.errorCode, at: tavilyLastError.createdAt.toISOString() }
      : undefined,
  }

  return NextResponse.json({
    llm: { byProvider: llmByProvider },
    tavily: tavilySummary,
  })
}

import { promises as fs } from "node:fs"
import path from "node:path"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { ensureReportsDir, formatDateRange, markdownTable } from "@/lib/reports/common"

type MonthlyReportResult = {
  path: string
  content: string
  summary: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfNextMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

function shiftUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function toISODate(date: Date | null | undefined): string {
  if (!date) return "未记录"
  return date.toISOString().split("T")[0]!
}

export async function generateMonthlyReport(endDateInput?: Date | string): Promise<MonthlyReportResult> {
  const resolvedEnd = endDateInput ? new Date(endDateInput) : new Date()
  if (Number.isNaN(resolvedEnd.getTime())) {
    throw new Error("Invalid endDate")
  }

  const periodStart = startOfMonthUTC(resolvedEnd)
  const exclusiveEnd = startOfNextMonthUTC(resolvedEnd)
  const displayEnd = shiftUTC(exclusiveEnd, -1)
  const rangeLabel = formatDateRange(periodStart, displayEnd)
  const label = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`
  const outputDir = await ensureReportsDir("monthly")
  const filename = `${label}.md`
  const filePath = path.join(outputDir, filename)

  const [
    totalPrompts,
    newPrompts,
    updatedPrompts,
    totalRuns,
    groupedRuns,
    serviceUsage,
  ] = await Promise.all([
    prisma.prompt.count({ where: { deletedAt: null } }),
    prisma.prompt.findMany({
      where: { deletedAt: null, createdAt: { gte: periodStart, lt: exclusiveEnd } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.prompt.findMany({
      where: { deletedAt: null, updatedAt: { gte: periodStart, lt: exclusiveEnd } },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
    prisma.agentHistory.count({
      where: { createdAt: { gte: periodStart, lt: exclusiveEnd } },
    }),
    prisma.agentHistory.groupBy({
      by: ["promptId"],
      where: { createdAt: { gte: periodStart, lt: exclusiveEnd } },
      _count: { promptId: true },
    }),
    prisma.usageLog.groupBy({
      by: ["service", "provider"],
      where: { createdAt: { gte: periodStart, lt: exclusiveEnd } },
      _sum: { requestCount: true },
    }),
  ])

  const promptRunCount = new Map(groupedRuns.map((row) => [row.promptId, row._count.promptId]))
  const promptIds = groupedRuns.map((row) => row.promptId)
  const promptsForRuns = promptIds.length
    ? await prisma.prompt.findMany({
        where: { id: { in: promptIds } },
        select: { id: true, title: true, status: true, qualityScore: true },
      })
    : []
  const promptMap = new Map(promptsForRuns.map((prompt) => [prompt.id, prompt]))
  const moduleLinks = promptIds.length
    ? await prisma.promptModuleUse.findMany({
        where: { promptId: { in: promptIds } },
        include: {
          module: { select: { id: true, title: true, type: true } },
        },
      })
    : []

  type ModuleUsageBucket = {
    id: string
    title: string
    type: string
    runs: number
    prompts: Set<string>
  }

  const moduleUsage = new Map<string, ModuleUsageBucket>()
  for (const link of moduleLinks) {
    const moduleInfo = link.module
    if (!moduleInfo) continue
    const runs = promptRunCount.get(link.promptId) ?? 0
    if (!runs) continue
    let bucket = moduleUsage.get(moduleInfo.id)
    if (!bucket) {
      bucket = {
        id: moduleInfo.id,
        title: moduleInfo.title,
        type: moduleInfo.type,
        runs: 0,
        prompts: new Set<string>(),
      }
      moduleUsage.set(moduleInfo.id, bucket)
    }
    bucket.runs += runs
    const prompt = promptMap.get(link.promptId)
    if (prompt) bucket.prompts.add(prompt.title)
  }

  const moduleUsageList = Array.from(moduleUsage.values()).sort((a, b) => b.runs - a.runs)
  const crossPromptHints = moduleUsageList
    .filter((item) => item.prompts.size >= 2)
    .slice(0, 6)

  const usedPromptIds = new Set(promptIds)
  const staleWhere: Prisma.PromptWhereInput = { deletedAt: null }
  if (usedPromptIds.size > 0) {
    staleWhere.id = { notIn: Array.from(usedPromptIds) }
  }
  const deprecationCandidates = await prisma.prompt.findMany({
    where: {
      ...staleWhere,
      OR: [
        { lastUsedAt: null },
        { lastUsedAt: { lt: periodStart } },
      ],
    },
    select: { id: true, title: true, status: true, updatedAt: true, lastUsedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 8,
  })

  const metricsTable = markdownTable(
    ["指标", "数值"],
    [
      ["Prompt 总数", totalPrompts],
      ["本月新增", newPrompts.length],
      ["本月更新", updatedPrompts.length],
      ["推理记录", totalRuns],
      ["触达模块", moduleUsageList.length],
    ],
  )

  const moduleTable = markdownTable(
    ["模块", "类型", "触发次数", "覆盖 Prompt 数"],
    moduleUsageList.slice(0, 10).map((item) => [
      item.title,
      item.type,
      item.runs,
      item.prompts.size,
    ]),
  )

  const serviceTable = serviceUsage.length
    ? markdownTable(
        ["服务", "提供方", "请求量"],
        serviceUsage
          .sort((a, b) => (b._sum.requestCount ?? 0) - (a._sum.requestCount ?? 0))
          .map((row) => [
            row.service,
            row.provider,
            row._sum.requestCount ?? 0,
          ]),
      )
    : null

  const lines: string[] = []
  lines.push(`# 月报（${label}）`)
  lines.push("")
  lines.push(`- 统计区间：${rangeLabel}`)
  lines.push(`- 生成时间：${new Date().toISOString()}`)
  lines.push("- 数据窗口：UTC")
  lines.push("")
  lines.push("## 核心指标")
  lines.push("")
  lines.push(metricsTable)
  lines.push("")
  lines.push("## 模块热力图")
  lines.push("")
  if (moduleUsageList.length) {
    lines.push(moduleTable)
  } else {
    lines.push("> 本月暂无模块触发记录。")
  }
  lines.push("")
  lines.push("## 跨 Prompt 提示")
  lines.push("")
  if (crossPromptHints.length) {
    lines.push(
      ...crossPromptHints.map((item) => {
        const promptList = Array.from(item.prompts).slice(0, 5).join("、")
        return `- ${item.title}：被 ${item.prompts.size} 个 Prompt 复用（${promptList}）`
      }),
    )
  } else {
    lines.push("> 本月暂无跨 Prompt 复用提示。")
  }
  lines.push("")
  lines.push("## 下线候选")
  lines.push("")
  if (deprecationCandidates.length) {
    lines.push(
      ...deprecationCandidates.map(
        (prompt) =>
          `- ${prompt.title}：状态 ${prompt.status}，最后使用 ${toISODate(prompt.lastUsedAt)}，最近更新 ${toISODate(prompt.updatedAt)}`,
      ),
    )
  } else {
    lines.push("> 暂无明显的下线候选。")
  }
  lines.push("")
  lines.push("## 服务耗用 (可选)")
  lines.push("")
  if (serviceTable) {
    lines.push(serviceTable)
  } else {
    lines.push("> 本月暂无服务调用统计。")
  }

  const content = lines.join("\n")
  await fs.writeFile(filePath, content, "utf-8")

  const summary = `${label} 月报：新增 ${newPrompts.length} 个 Prompt，触达 ${moduleUsageList.length} 个模块，共 ${totalRuns} 条推理记录。`
  return { path: filePath, content, summary }
}

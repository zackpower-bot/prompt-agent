import { promises as fs } from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { ensureReportsDir, formatDateRange, markdownTable, weekNumber } from "@/lib/reports/common"

type WeeklyReportResult = {
  path: string
  content: string
  summary: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function shiftUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]!
}

export async function generateWeeklyReport(endDateInput?: Date | string): Promise<WeeklyReportResult> {
  const resolvedEnd = endDateInput ? new Date(endDateInput) : new Date()
  if (Number.isNaN(resolvedEnd.getTime())) {
    throw new Error("Invalid endDate")
  }

  const periodEnd = startOfDayUTC(resolvedEnd)
  const periodStart = shiftUTC(periodEnd, -6)
  const exclusiveEnd = shiftUTC(periodEnd, 1)

  const rangeLabel = formatDateRange(periodStart, periodEnd)
  const weekInfo = weekNumber(periodEnd)
  const outputDir = await ensureReportsDir("weekly")
  const filename = `${weekInfo.year}-${String(weekInfo.week).padStart(2, "0")}.md`
  const filePath = path.join(outputDir, filename)

  const [
    totalPrompts,
    newPrompts,
    updatedPrompts,
    totalRuns,
    groupedRuns,
  ] = await Promise.all([
    prisma.prompt.count({ where: { deletedAt: null } }),
    prisma.prompt.findMany({
      where: { deletedAt: null, createdAt: { gte: periodStart, lt: exclusiveEnd } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.prompt.findMany({
      where: { deletedAt: null, updatedAt: { gte: periodStart, lt: exclusiveEnd } },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.agentHistory.count({
      where: { createdAt: { gte: periodStart, lt: exclusiveEnd } },
    }),
    prisma.agentHistory.groupBy({
      by: ["promptId"],
      where: { createdAt: { gte: periodStart, lt: exclusiveEnd } },
      _count: { promptId: true },
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
    if (prompt) {
      bucket.prompts.add(prompt.title)
    }
  }

  const moduleUsageList = Array.from(moduleUsage.values()).sort((a, b) => b.runs - a.runs)
  const topPrompts = groupedRuns
    .map((row) => {
      const prompt = promptMap.get(row.promptId)
      if (!prompt) return null
      return {
        id: prompt.id,
        title: prompt.title,
        status: prompt.status,
        qualityScore: prompt.qualityScore,
        runs: row._count.promptId,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  topPrompts.sort((a, b) => b.runs - a.runs)

  const qualityAlerts = topPrompts
    .filter((prompt) => typeof prompt.qualityScore === "number" && prompt.qualityScore < 0.65)
    .slice(0, 5)

  const metricsTable = markdownTable(
    ["指标", "数值"],
    [
      ["Prompt 总数", totalPrompts],
      ["本周新增", newPrompts.length],
      ["本周更新", updatedPrompts.length],
      ["推理记录", totalRuns],
      ["触达模块", moduleUsageList.length],
    ],
  )

  const moduleTable = markdownTable(
    ["模块", "类型", "覆盖 Prompt 数", "触发次数"],
    moduleUsageList.slice(0, 8).map((item) => [
      item.title,
      item.type,
      item.prompts.size,
      item.runs,
    ]),
  )

  const nowISO = new Date().toISOString()
  const lines: string[] = []
  lines.push(`# 周报（${weekInfo.label}）`)
  lines.push("")
  lines.push(`- 统计区间：${rangeLabel}`)
  lines.push(`- 生成时间：${nowISO}`)
  lines.push("- 数据窗口：UTC")
  lines.push("")
  lines.push("## 核心指标")
  lines.push("")
  lines.push(metricsTable)
  lines.push("")
  lines.push("## 新增 Prompt")
  lines.push("")
  if (newPrompts.length) {
    lines.push(
      ...newPrompts.map(
        (prompt) => `- ${prompt.title}（${prompt.status}，创建于 ${toISODate(prompt.createdAt)}）`,
      ),
    )
  } else {
    lines.push("> 本周暂无新增 Prompt。")
  }
  lines.push("")
  lines.push("## 活跃 Prompt")
  lines.push("")
  if (topPrompts.length) {
    lines.push(
      ...topPrompts.slice(0, 5).map(
        (prompt) => `- ${prompt.title}：${prompt.runs} 次运行，状态 ${prompt.status}`,
      ),
    )
  } else {
    lines.push("> 本周暂无运行记录。")
  }
  lines.push("")
  lines.push("## 模块使用榜")
  lines.push("")
  if (moduleUsageList.length) {
    lines.push(moduleTable)
  } else {
    lines.push("> 本周暂无模块触发记录。")
  }
  lines.push("")
  lines.push("## 质量警示")
  lines.push("")
  if (qualityAlerts.length) {
    lines.push(
      ...qualityAlerts.map((prompt) => {
        const runs = promptRunCount.get(prompt.id) ?? 0
        return `- ${prompt.title}：质量 ${prompt.qualityScore?.toFixed(2) ?? "未知"}，本周 ${runs} 次`
      }),
    )
  } else {
    lines.push("> 本周暂无质量警示样本。")
  }
  lines.push("")
  lines.push("## 更新摘要")
  lines.push("")
  if (updatedPrompts.length) {
    lines.push(
      ...updatedPrompts.map(
        (prompt) => `- ${toISODate(prompt.updatedAt)}：${prompt.title}（${prompt.status}）`,
      ),
    )
  } else {
    lines.push("> 无最近更新。")
  }

  const content = lines.join("\n")
  await fs.writeFile(filePath, content, "utf-8")

  const summary = `周次 ${weekInfo.label}：新增 ${newPrompts.length} 个 Prompt，触发 ${totalRuns} 次推理，涉及 ${moduleUsageList.length} 个模块。`
  return { path: filePath, content, summary }
}

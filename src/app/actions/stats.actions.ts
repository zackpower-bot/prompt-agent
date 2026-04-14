"use server"

import { prisma } from "@/lib/prisma"

export interface UsageStats {
  totalPrompts: number
  byStatus: { status: string; count: number }[]
  byCategory: { category: string; count: number }[]
  topTags: { name: string; count: number }[]
  agentRuns: number
  totalTokens: number
  byProvider: { provider: string; count: number }[]
  qualityDistribution: { bucket: "A" | "B" | "C" | "D" | "unscored"; label: string; count: number; range: string }[]
  recentActivity: { id: string; title: string; updatedAt: string; type: "prompt" }[]
}

export async function getUsageStats(): Promise<{ success: true; data: UsageStats } | { success: false; error: string }> {
  try {
    // Quality buckets:
    // A >= 0.85 (label: 优秀 ≥85%), B: 0.70-0.85 (达标 70–85%), C: 0.50-0.70 (待改进 50–70%), D: <0.50 (低质 <50%), unscored: null (未评分)
    const promptWhere = { deletedAt: null as null | Date }
    const [
      totalPrompts,
      prompts,
      tags,
      agentHistory,
      recentPrompts,
      qualityBuckets,
    ] = await Promise.all([
      prisma.prompt.count({ where: promptWhere }),
      prisma.prompt.findMany({ select: { status: true, category: true }, where: promptWhere }),
      prisma.tag.findMany({
        orderBy: { name: "asc" },
        include: {
          prompts: {
            where: { prompt: { deletedAt: null } },
            select: { promptId: true },
          },
        },
      }),
      prisma.agentHistory.findMany({ select: { provider: true, output: true } }),
      prisma.prompt.findMany({
        select: { id: true, title: true, updatedAt: true },
        where: promptWhere,
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
        SELECT bucket, COUNT(*) AS count
        FROM (
          SELECT
            CASE
              WHEN "qualityScore" IS NULL THEN 'unscored'
              WHEN "qualityScore" >= 0.85 THEN 'A'
              WHEN "qualityScore" >= 0.70 THEN 'B'
              WHEN "qualityScore" >= 0.50 THEN 'C'
              ELSE 'D'
            END AS bucket
          FROM "Prompt"
          WHERE "deletedAt" IS NULL
        ) q
        GROUP BY bucket
      `,
    ])

    // By status
    const statusMap = new Map<string, number>()
    for (const p of prompts) statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1)
    const byStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }))

    // By category
    const catMap = new Map<string, number>()
    for (const p of prompts) catMap.set(p.category, (catMap.get(p.category) ?? 0) + 1)
    const byCategory = [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // Top tags
    const topTags = tags
      .map((t) => ({ name: t.name, count: t.prompts.length }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Agent stats
    const agentRuns = agentHistory.length
    let totalTokens = 0
    const providerMap = new Map<string, number>()
    for (const h of agentHistory) {
      providerMap.set(h.provider, (providerMap.get(h.provider) ?? 0) + 1)
      try {
        const output = JSON.parse(h.output)
        totalTokens += (output.inputTokens ?? 0) + (output.outputTokens ?? 0)
      } catch {}
    }
    const byProvider = [...providerMap.entries()].map(([provider, count]) => ({ provider, count }))

    // Recent activity
    const recentActivity = recentPrompts.map((p) => ({
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt.toISOString(),
      type: "prompt" as const,
    }))

    const bucketMeta: UsageStats["qualityDistribution"] = [
      { bucket: "A", label: "优秀 ≥85%", range: "≥85%", count: 0 },
      { bucket: "B", label: "达标 70–85%", range: "70–85%", count: 0 },
      { bucket: "C", label: "待改进 50–70%", range: "50–70%", count: 0 },
      { bucket: "D", label: "低质 <50%", range: "<50%", count: 0 },
      { bucket: "unscored", label: "未评分", range: "未评分", count: 0 },
    ]
    const bucketMap = new Map<string, number>()
    for (const row of qualityBuckets) {
      const numericCount = typeof row.count === "bigint" ? Number(row.count) : Number(row.count ?? 0)
      bucketMap.set(row.bucket, numericCount)
    }
    const qualityDistribution = bucketMeta.map((meta) => ({
      ...meta,
      count: bucketMap.get(meta.bucket) ?? 0,
    }))

    return {
      success: true,
      data: { totalPrompts, byStatus, byCategory, topTags, agentRuns, totalTokens, byProvider, qualityDistribution, recentActivity },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

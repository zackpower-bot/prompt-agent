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
  recentActivity: { id: string; title: string; updatedAt: string; type: "prompt" }[]
}

export async function getUsageStats(): Promise<{ success: true; data: UsageStats } | { success: false; error: string }> {
  try {
    const [
      totalPrompts,
      prompts,
      tags,
      agentHistory,
      recentPrompts,
    ] = await Promise.all([
      prisma.prompt.count(),
      prisma.prompt.findMany({ select: { status: true, category: true } }),
      prisma.tag.findMany({ include: { _count: { select: { prompts: true } } }, orderBy: { name: "asc" } }),
      prisma.agentHistory.findMany({ select: { provider: true, output: true } }),
      prisma.prompt.findMany({ select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
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
      .map((t) => ({ name: t.name, count: t._count.prompts }))
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

    return {
      success: true,
      data: { totalPrompts, byStatus, byCategory, topTags, agentRuns, totalTokens, byProvider, recentActivity },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

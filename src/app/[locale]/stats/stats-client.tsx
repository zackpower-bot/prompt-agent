"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Tag, Bot, Clock, Layers, Zap } from "lucide-react"
import type { UsageStats } from "@/app/actions/stats.actions"

type UsageApiSnapshot = {
  llm: {
    byProvider: {
      provider: string
      model: string
      requests: number
      inputTokens: number
      outputTokens: number
      successRate: number
      last24h: number
      last7d: number
    }[]
  }
  tavily: {
    total: number
    last24h: number
    last7d: number
    successRate: number
    lastError?: { errorCode?: string | null; at: string }
    quota: {
      monthlyLimit: number
      usedThisMonth: number
      remaining: number
      resetAt: string
      percentUsed: number
    }
  }
}

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string | number; icon: any; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  )
}

function BarItem({
  label,
  count,
  max,
  colorClass = "bg-agent",
  subLabel,
}: { label: string; count: number; max: number; colorClass?: string; subLabel?: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 text-sm">
        <span className="w-16 truncate text-xs text-muted-foreground sm:w-24">{label}</span>
        <div className="flex-1 h-5 overflow-hidden rounded-sm bg-muted">
          <div className={`h-full rounded-sm transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 text-right mono-label sm:w-8">{count}</span>
      </div>
      {subLabel && <p className="ml-16 text-[10px] text-muted-foreground sm:ml-24">{subLabel}</p>}
    </div>
  )
}

export function StatsClient({ stats, usage }: { stats: UsageStats | null; usage: UsageApiSnapshot | null }) {
  const [usageSnapshot, setUsageSnapshot] = useState<UsageApiSnapshot | null>(usage)
  const [usageLoading, setUsageLoading] = useState(!usage)
  const [usageError, setUsageError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadUsage() {
      try {
        setUsageLoading(true)
        const res = await fetch("/api/usage", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = (await res.json()) as UsageApiSnapshot
        if (cancelled) return
        setUsageSnapshot(payload)
        setUsageError(null)
      } catch (err) {
        if (cancelled) return
        setUsageError((err as Error).message)
      } finally {
        if (!cancelled) setUsageLoading(false)
      }
    }
    loadUsage()
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return <p className="p-8 text-center text-muted-foreground">加载失败</p>

  const llmUsage = usageSnapshot?.llm.byProvider ?? []
  const totalTokens = llmUsage.length
    ? llmUsage.reduce((sum, row) => sum + (row.inputTokens ?? 0) + (row.outputTokens ?? 0), 0)
    : stats.totalTokens
  const totalTokensLabel = totalTokens.toLocaleString()
  const sortedProviders = [...llmUsage].sort((a, b) => b.requests - a.requests)
  const tavilyUsage = usageSnapshot?.tavily
  const quota = tavilyUsage?.quota
  const tavilyPct = quota ? Math.min(1, Math.max(0, quota.percentUsed)) : 0
  const tavilyBarClass = tavilyPct >= 0.9 ? "bg-red-500" : tavilyPct >= 0.75 ? "bg-amber-500" : "bg-agent"
  const tavilyBarWidth = `${(tavilyPct * 100).toFixed(1)}%`

  const maxCat = Math.max(...stats.byCategory.map((c) => c.count), 1)
  const maxTag = Math.max(...stats.topTags.map((t) => t.count), 1)
  const fallbackProviders = stats.byProvider
  type QualityBucket = UsageStats["qualityDistribution"][number]["bucket"]
  const qualityColorMap: Record<QualityBucket, string> = {
    A: "bg-agent",
    B: "bg-agent/50",
    C: "bg-amber-500",
    D: "bg-red-500",
    unscored: "bg-muted",
  }
  const qualityCounts = stats.qualityDistribution.map((bucket) => bucket.count)
  const qualityMax = Math.max(...qualityCounts, 1)
  const totalQuality = qualityCounts.reduce((sum, value) => sum + value, 0)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="h-full overflow-y-auto px-4 py-8">
      <div className="mx-auto w-full">
        <h1 className="mb-6 text-2xl font-bold">使用统计</h1>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="提示词总数" value={stats.totalPrompts} icon={Layers} />
        <StatCard title="Agent 运行" value={stats.agentRuns} icon={Bot} />
        <StatCard title="Token 消耗" value={totalTokensLabel} icon={Zap} />
        <StatCard title="标签数" value={stats.topTags.length} icon={Tag} />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Tavily 网络搜索</CardTitle></CardHeader>
        <CardContent>
          {tavilyUsage && quota ? (
            <div className="space-y-3">
              <div>
                <p className="text-xl font-bold">
                  {quota.usedThisMonth.toLocaleString()} / {quota.monthlyLimit.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  24h: {tavilyUsage.last24h} · 7d: {tavilyUsage.last7d} · 成功率 {(tavilyUsage.successRate * 100).toFixed(1)}% · 重置于 {formatDate(quota.resetAt)}
                </p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${tavilyBarClass}`} style={{ width: tavilyBarWidth }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                剩余 {quota.remaining.toLocaleString()} · 月度限额 {quota.monthlyLimit.toLocaleString()}
              </p>
              {tavilyUsage.lastError && (
                <p className="text-xs text-muted-foreground">
                  上次失败: {tavilyUsage.lastError.errorCode ?? "unknown"} @ {formatDate(tavilyUsage.lastError.at)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {usageLoading ? "Tavily 用量加载中..." : "无法获取 Tavily 数据"}
              {!usageLoading && usageError ? ` · ${usageError}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status distribution */}
      <Card className="mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-sm">按状态分布</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {stats.byStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-2">
                <Badge variant="outline" className="mono-label">{s.status}</Badge>
                <span className="text-lg font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-sm">质量分布</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {totalQuality === 0 ? (
            <p className="text-xs text-muted-foreground">暂无质量数据</p>
          ) : (
            stats.qualityDistribution.map((bucket) => (
              <BarItem
                key={bucket.bucket}
                label={bucket.label}
                count={bucket.count}
                max={qualityMax}
                colorClass={qualityColorMap[bucket.bucket]}
                subLabel={bucket.range}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* By category */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-1.5 text-sm"><BarChart3 className="h-3.5 w-3.5" />按分类</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.byCategory.map((c) => <BarItem key={c.category} label={c.category} count={c.count} max={maxCat} />)}
          </CardContent>
        </Card>

        {/* Top tags */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-1.5 text-sm"><Tag className="h-3.5 w-3.5" />热门标签</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topTags.map((t) => <BarItem key={t.name} label={t.name} count={t.count} max={maxTag} />)}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">LLM Provider 用量</CardTitle>
          {!sortedProviders.length && (
            <p className="text-[11px] text-muted-foreground">使用历史 Agent 数据（API 未返回实时数据）</p>
          )}
        </CardHeader>
        <CardContent className="min-w-full overflow-x-auto">
          {sortedProviders.length > 0 ? (
            <table className="w-full min-w-[700px] text-xs sm:text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 text-left font-medium">Provider · 模型</th>
                  <th className="py-1 px-3 text-right font-medium">请求</th>
                  <th className="py-1 px-3 text-right font-medium">InputTok</th>
                  <th className="py-1 px-3 text-right font-medium">OutputTok</th>
                  <th className="py-1 px-3 text-right font-medium">成功率</th>
                  <th className="py-1 px-3 text-right font-medium">24h</th>
                  <th className="py-1 pl-3 text-right font-medium">7d</th>
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map((row) => (
                  <tr key={`${row.provider}-${row.model}`} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{row.provider} · {row.model}</td>
                    <td className="py-2 px-3 text-right mono-label">{row.requests.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right mono-label">{row.inputTokens.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right mono-label">{row.outputTokens.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right mono-label">{(row.successRate * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right mono-label">{row.last24h.toLocaleString()}</td>
                    <td className="py-2 pl-3 text-right mono-label">{row.last7d.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : fallbackProviders.length > 0 ? (
            <div className="space-y-2">
              {fallbackProviders.map((row) => (
                <div key={row.provider} className="flex items-center justify-between border-b border-border/50 py-1 text-sm">
                  <span className="font-medium">{row.provider}</span>
                  <span className="mono-label text-muted-foreground">{row.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">暂无 LLM Provider 数据</p>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-1.5 text-sm"><Clock className="h-3.5 w-3.5" />最近活动</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{a.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(a.updatedAt)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

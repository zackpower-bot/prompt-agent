"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Tag, Bot, Clock, Layers, Zap } from "lucide-react"
import type { UsageStats } from "@/app/actions/stats.actions"

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

function BarItem({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 sm:w-24 truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-5 rounded-sm bg-muted overflow-hidden">
        <div className="h-full rounded-sm bg-agent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 sm:w-8 text-right mono-label">{count}</span>
    </div>
  )
}

export function StatsClient({ stats }: { stats: UsageStats | null }) {
  if (!stats) return <p className="p-8 text-center text-muted-foreground">加载失败</p>

  const maxCat = Math.max(...stats.byCategory.map((c) => c.count), 1)
  const maxTag = Math.max(...stats.topTags.map((t) => t.count), 1)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">使用统计</h1>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="提示词总数" value={stats.totalPrompts} icon={Layers} />
        <StatCard title="Agent 运行" value={stats.agentRuns} icon={Bot} />
        <StatCard title="Token 消耗" value={stats.totalTokens.toLocaleString()} icon={Zap} />
        <StatCard title="标签数" value={stats.topTags.length} icon={Tag} />
      </div>

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

      {/* Provider distribution */}
      {stats.byProvider.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Provider 分布</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.byProvider.map((p) => (
                <div key={p.provider} className="flex items-center gap-2">
                  <Badge variant="outline" className="mono-label">{p.provider}</Badge>
                  <span className="font-bold">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
  )
}

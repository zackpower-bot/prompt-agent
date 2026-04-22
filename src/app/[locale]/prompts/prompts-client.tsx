"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { getPromptsPaginated } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"
import { cn } from "@/lib/utils"
import { parseJsonResponseOrThrow } from "@/lib/utils"

interface PromptsClientProps {
  initialData: {
    prompts: PromptWithTags[]
    total: number
    page: number
    pageSize: number
  }
  allTags: string[]
}

export function PromptsClient({ initialData, allTags }: PromptsClientProps) {
  const [prompts, setPrompts] = useState(initialData.prompts)
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(initialData.total)
  const [page, setPage] = useState(initialData.page)
  const [pageSize] = useState(initialData.pageSize)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const TAG_LIMIT = 8
  const visibleTags = tagsExpanded ? allTags : allTags.slice(0, TAG_LIMIT)

  useEffect(() => {
    if (!search) { setDebouncedSearch(""); return }
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPrompts = useCallback((p: number) => {
    startTransition(async () => {
      const result = await getPromptsPaginated(p, pageSize, {
        search: debouncedSearch || undefined,
        tag: selectedTag !== "all" ? selectedTag : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      })
      if (result.success) {
        setPrompts(result.data.prompts)
        setTotal(result.data.total)
        setPage(result.data.page)
      }
    })
  }, [pageSize, debouncedSearch, selectedTag, selectedStatus])

  useEffect(() => { fetchPrompts(1) }, [fetchPrompts])

  useEffect(() => {
    const ids = prompts.map((prompt) => prompt.id)
    if (ids.length === 0) {
      setUsageMap({})
      return
    }

    let active = true
    void (async () => {
      try {
        const response = await fetch(`/api/usage/entity?type=prompt&ids=${ids.join(",")}`)
        const payload = await parseJsonResponseOrThrow<{
          counts?: Record<string, { total?: number }>
        }>(response, "加载使用统计失败")
        if (!active || !payload?.counts) return
        const next: Record<string, number> = {}
        for (const [id, stats] of Object.entries(payload.counts)) {
          next[id] = typeof stats.total === "number" ? stats.total : 0
        }
        setUsageMap(next)
      } catch {}
    })()

    return () => {
      active = false
    }
  }, [prompts])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })

  return (
    <div className="container-reading">
      <div className="grid gap-0 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/60 pr-5 pt-4 lg:block">
          <div className="space-y-6">
            <FilterGroup heading="Scope">
              {([
                ["all", "全部", total],
                ["inbox", "收件箱", prompts.filter((item) => item.status === "inbox").length],
                ["production", "生产", prompts.filter((item) => item.status === "production").length],
                ["archived", "归档", prompts.filter((item) => item.status === "archived").length],
              ] as const).map(([value, label, count]) => (
                <FilterRailButton
                  key={value}
                  active={selectedStatus === value}
                  label={label}
                  count={count}
                  onClick={() => setSelectedStatus(value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup heading="Tag">
              {visibleTags.map((tag) => (
                <FilterRailButton
                  key={tag}
                  active={selectedTag === tag}
                  label={tag}
                  onClick={() => setSelectedTag(tag)}
                />
              ))}
              {allTags.length > TAG_LIMIT && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setTagsExpanded(!tagsExpanded)}
                >
                  {tagsExpanded ? "收起" : `展开其余 ${allTags.length - TAG_LIMIT} 个标签`}
                </button>
              )}
            </FilterGroup>
          </div>
        </aside>

        <div className="min-w-0 py-4 lg:px-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{total} prompts</p>
              <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] text-foreground">Library</h1>
              <p className="text-sm text-muted-foreground">
                所有已保存的提示词资产，按收件箱、生产与归档状态浏览和复用。
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/prompts/export")}
              >
                导出
              </Button>
              <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground">
                导入
                <input
                  type="file"
                  accept=".json"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    const res = await fetch("/api/prompts/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: text,
                    })
                    const data = await parseJsonResponseOrThrow<{ imported?: number }>(res, "导入失败")
                    if (data.imported) {
                      fetchPrompts(1)
                    }
                    e.target.value = ""
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-[300px] flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="按标题、标签或内容搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["all", "inbox", "production", "archived"].map((s) => (
                <Button
                  key={s}
                  variant={selectedStatus === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(s)}
                >
                  {s === "all" ? "全部" : s === "inbox" ? "收件箱" : s === "production" ? "生产" : "归档"}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {isPending && (
              <div className="border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">加载中...</div>
            )}

            {prompts.length > 0 ? (
              <ul>
                {prompts.map((prompt, index) => (
                  <li key={prompt.id} className={index < prompts.length - 1 ? "border-b border-border/60" : ""}>
                    <Link
                      href={`/prompts/${prompt.id}`}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px] border border-border bg-background" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{prompt.title}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {prompt.description || prompt.content.slice(0, 120)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={prompt.status === "production" ? "warm" : "outline"} className="text-[10px]">
                            {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : "归档"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {prompt.category}
                          </Badge>
                          {prompt.tags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">· {formatDate(prompt.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {prompt.qualityScore !== null && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={cn("h-1.5 w-1.5 rounded-full", getQualityDotClass(prompt.qualityScore))} />
                            <span>{Math.round(prompt.qualityScore * 100)}</span>
                          </span>
                        )}
                        {usageMap[prompt.id] !== undefined && usageMap[prompt.id] > 0 && (
                          <span className="text-xs text-muted-foreground">{usageMap[prompt.id]} 次</span>
                        )}
                        <Button variant="ghost" size="icon-sm" tabIndex={-1}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !isPending ? (
              <div className="px-6 py-16 text-center">
                <h2 className="text-xl">还没有找到合适的提示词</h2>
                <p className="mx-auto mt-3 max-w-[38rem] text-sm leading-7 text-muted-foreground">
                  可以先换一个关键词，或者放宽标签与状态筛选。
                  <br />
                  当库里开始积累内容后，这里会成为你回看、筛选和复用提示词的主入口。
                </p>
              </div>
            ) : null}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-1 text-sm text-muted-foreground">
              <span>
                第 {page} 页，共 {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => fetchPrompts(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-8"
                  disabled
                >
                  {page}
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => fetchPrompts(page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{heading}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function FilterRailButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
        active && "bg-muted/80 font-medium text-foreground"
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className="text-xs text-muted-foreground">{count}</span> : null}
    </button>
  )
}

function getQualityDotClass(score: number | null) {
  if (score === null || score === undefined) return "bg-secondary"
  if (score >= 0.85) return "bg-emerald-600"
  if (score >= 0.7) return "bg-amber-500"
  if (score >= 0.5) return "bg-orange-500"
  return "bg-destructive"
}

"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { getPromptsPaginated } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"

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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })

  const getQualityBadgeClass = (score: number | null) => {
    if (score === null || score === undefined) return "bg-secondary text-secondary-foreground"
    if (score >= 0.85) return "bg-agent/15 text-agent"
    if (score >= 0.7) return "bg-secondary text-secondary-foreground"
    if (score >= 0.5) return "bg-amber-500/15 text-amber-700"
    return "bg-destructive/10 text-destructive"
  }

  return (
    <div className="container-reading">
      <div className="sticky top-0 z-10 mb-6 bg-background/80 py-3 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索提示词..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/prompts/export")}
              >
                导出
              </Button>
              <label className="inline-flex h-7 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted hover:text-foreground">
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
                    const data = await res.json()
                    if (data.imported) {
                      fetchPrompts(1)
                    }
                    e.target.value = ""
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-muted-foreground">{total} 条提示词</p>
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

          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedTag === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedTag("all")}
            >
              全部标签
            </Button>
            {visibleTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
            {allTags.length > TAG_LIMIT && (
              <Button
                variant="outline"
                size="sm"
                className="border-dashed text-muted-foreground hover:text-foreground"
                onClick={() => setTagsExpanded(!tagsExpanded)}
              >
                {tagsExpanded ? "收起" : `+${allTags.length - TAG_LIMIT}`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isPending && (
        <div className="mb-4 text-center text-sm text-muted-foreground">加载中...</div>
      )}

      <ul className="space-y-1">
        {prompts.map((prompt) => (
          <li key={prompt.id}>
            <Link href={`/prompts/${prompt.id}`} className="list-row">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-serif text-base">{prompt.title}</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {prompt.description || prompt.content.slice(0, 120)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : prompt.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {prompt.category}
                  </Badge>
                  {prompt.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{prompt.tags.length - 3}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {prompt.qualityScore !== null && (
                  <Badge className={getQualityBadgeClass(prompt.qualityScore)}>
                    {Math.round(prompt.qualityScore * 100)}%
                  </Badge>
                )}
                <time className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(prompt.updatedAt)}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {prompts.length === 0 && !isPending && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <h2 className="text-xl">还没有找到合适的提示词</h2>
          <p className="mx-auto mt-3 max-w-[38rem] text-sm leading-7 text-muted-foreground">
            可以先换一个关键词，或者放宽标签与状态筛选。
            <br />
            当库里开始积累内容后，这里会成为你回看、筛选和复用提示词的主入口。
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchPrompts(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => fetchPrompts(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

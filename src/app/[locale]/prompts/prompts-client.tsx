"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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

  // Debounce search
  useEffect(() => {
    if (!search) { setDebouncedSearch(""); return }
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch on filter/page change
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{total} 条提示词</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索提示词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter */}
      <div className="mb-3 flex gap-2">
        {["all", "inbox", "production", "archived"].map((s) => (
          <button
            key={s}
            className={`tag-chip cursor-pointer transition-colors ${selectedStatus === s ? "border-foreground bg-foreground text-background" : "bg-background text-foreground hover:bg-accent"}`}
            onClick={() => setSelectedStatus(s)}
          >
            {s === "all" ? "全部" : s === "inbox" ? "收件箱" : s === "production" ? "生产" : "归档"}
          </button>
        ))}
      </div>

      {/* Tags */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <button
          className={`tag-chip cursor-pointer transition-colors ${selectedTag === "all" ? "border-foreground bg-foreground text-background" : "bg-background text-foreground hover:bg-accent"}`}
          onClick={() => setSelectedTag("all")}
        >
          全部标签
        </button>
        {visibleTags.map((tag) => (
          <button
            key={tag}
            className={`tag-chip cursor-pointer transition-colors ${selectedTag === tag ? "border-foreground bg-foreground text-background" : "bg-background text-foreground hover:bg-accent"}`}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </button>
        ))}
        {allTags.length > TAG_LIMIT && (
          <button
            className="tag-chip cursor-pointer border-dashed text-muted-foreground hover:text-foreground"
            onClick={() => setTagsExpanded(!tagsExpanded)}
          >
            {tagsExpanded ? "−" : `+${allTags.length - TAG_LIMIT}`}
          </button>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Prompt list */}
      {isPending && (
        <div className="mb-4 text-center text-sm text-muted-foreground">加载中...</div>
      )}

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
            <Card className="transition hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{prompt.title}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(prompt.updatedAt)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                  {prompt.description || prompt.content.slice(0, 120)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : prompt.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{prompt.category}</Badge>
                  {prompt.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{prompt.tags.length - 3}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {prompts.length === 0 && !isPending && (
        <div className="py-16 text-center text-sm text-muted-foreground">无匹配的提示词</div>
      )}

      {/* Pagination */}
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

"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Tag,
  Pencil,
  Trash2,
  Archive,
  Save,
  X,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { updatePrompt, deletePrompt } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"
import { createVersion } from "@/app/actions/version.actions"
import { VersionList } from "@/components/prompts/version-list"
import { ModuleSuggestions } from "@/components/prompts/module-suggestions"
import { ScenarioSuggestions } from "@/components/prompts/scenario-suggestions"
import { TestCaseSection } from "@/components/prompts/test-case-section"
import { submitFeedback } from "@/app/actions/feedback.actions"
import type { TestCaseDTO } from "@/lib/test-case"
import { parseJsonResponseOrThrow } from "@/lib/utils"

interface Props {
  prompt: PromptWithTags
  initialTestCases: TestCaseDTO[]
}

interface PromptUsageStats {
  total: number
  lastUsedAt: string | null
}

export function PromptDetailClient({ prompt: initialPrompt, initialTestCases }: Props) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)
  const [usageStats, setUsageStats] = useState<PromptUsageStats | null>(null)

  const [title, setTitle] = useState(prompt.title)
  const [description, setDescription] = useState(prompt.description)
  const [content, setContent] = useState(prompt.content)
  const [category, setCategory] = useState(prompt.category)
  const [status, setStatus] = useState(prompt.status)
  const [tagsInput, setTagsInput] = useState(prompt.tags.join(", "))

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    fetch("/api/usage/entity/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "prompt",
        entityId: prompt.id,
        action: "copy",
        context: "detail_copy",
      }),
    }).catch(() => {})
  }, [prompt.content, prompt.id])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch(`/api/usage/entity?type=prompt&id=${prompt.id}`)
        const payload = await parseJsonResponseOrThrow<{ total?: number; lastUsedAt?: string | null }>(
          response,
          "加载使用统计失败"
        )
        if (!active) return
        setUsageStats({
          total: typeof payload.total === "number" ? payload.total : 0,
          lastUsedAt: typeof payload.lastUsedAt === "string" ? payload.lastUsedAt : null,
        })
      } catch {}
    })()

    return () => {
      active = false
    }
  }, [prompt.id])

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const result = await updatePrompt(prompt.id, {
        title,
        description,
        content,
        category,
        tags,
        status,
      })
      if (result.success) {
        await createVersion(prompt.id)
        setPrompt(result.data)
        setEditing(false)
      }
    })
  }, [prompt.id, title, description, content, category, status, tagsInput])

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startTransition(async () => {
      const result = await deletePrompt(prompt.id)
      if (result.success) router.push("/prompts")
    })
  }, [prompt.id, confirmDelete, router])

  const handleArchive = useCallback(() => {
    startTransition(async () => {
      const result = await updatePrompt(prompt.id, { status: "archived" })
      if (result.success) {
        setPrompt(result.data)
        setStatus("archived")
      }
    })
  }, [prompt.id])

  const cancelEdit = () => {
    setEditing(false)
    setTitle(prompt.title)
    setDescription(prompt.description)
    setContent(prompt.content)
    setCategory(prompt.category)
    setStatus(prompt.status)
    setTagsInput(prompt.tags.join(", "))
    setConfirmDelete(false)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatRelative = (value: string) => {
    const diff = Date.now() - new Date(value).getTime()
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} 分钟前`
    if (diff < day) return `${Math.max(1, Math.round(diff / hour))} 小时前`
    return `${Math.max(1, Math.round(diff / day))} 天前`
  }

  return (
    <div className="container-reading">
      <Link
        href="/prompts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <MetaCard
            title="Identity"
            rows={[
              { label: "id", value: prompt.id.slice(0, 12) },
              { label: "version", value: "current" },
              { label: "scope", value: prompt.status },
              { label: "author", value: "@local" },
              { label: "updated", value: formatRelative(prompt.updatedAt) },
            ]}
          />
          <MetaCard
            title="Defaults"
            rows={[
              { label: "category", value: prompt.category },
              { label: "model", value: prompt.model },
              { label: "tags", value: String(prompt.tags.length) },
              { label: "feedback", value: feedbackGiven ?? "—" },
            ]}
          />
          <MetaCard
            title="Performance · 30d"
            rows={[
              { label: "runs", value: String(usageStats?.total ?? 0) },
              {
                label: "quality",
                value: prompt.qualityScore !== null ? `${Math.round(prompt.qualityScore * 100)}%` : "—",
              },
              { label: "created", value: formatRelative(prompt.createdAt) },
              { label: "last used", value: usageStats?.lastUsedAt ? formatRelative(usageStats.lastUsedAt) : "—" },
            ]}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                PROMPT · {prompt.category} / {prompt.status}
              </p>
              {editing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xl text-xl font-semibold" />
              ) : (
                <h1 className="font-serif text-3xl font-medium tracking-[-0.02em] text-foreground">{prompt.title}</h1>
              )}

              {editing ? (
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述..."
                  className="max-w-2xl"
                />
              ) : prompt.description ? (
                <p className="max-w-[72ch] text-sm leading-7 text-muted-foreground">{prompt.description}</p>
              ) : null}

              {editing ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="分类"
                    className="w-full sm:w-40"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm shadow-xs"
                  >
                    <option value="inbox">收件箱</option>
                    <option value="production">生产</option>
                    <option value="archived">归档</option>
                  </select>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="标签（逗号分隔）"
                    className="min-w-[220px] flex-1"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={prompt.status === "production" ? "warm" : "outline"}>
                    {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : "归档"}
                  </Badge>
                  <Badge variant="secondary">{prompt.category}</Badge>
                  <Badge variant="outline">{prompt.model}</Badge>
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="mr-1 h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  创建于 {formatDate(prompt.createdAt)}
                </span>
                <span>更新于 {formatDate(prompt.updatedAt)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    <Save className="mr-1 h-3.5 w-3.5" />
                    {isPending ? "保存中..." : "保存"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    取消
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    编辑
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                    {copied ? "已复制" : "复制"}
                  </Button>
                  <Button
                    size="sm"
                    variant={feedbackGiven === "positive" ? "default" : "outline"}
                    onClick={() => {
                      setFeedbackGiven("positive")
                      void submitFeedback(prompt.id, "positive")
                    }}
                    disabled={feedbackGiven !== null || isPending}
                  >
                    <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                    {feedbackGiven === "positive" ? "已评" : "👍"}
                  </Button>
                  <Button
                    size="sm"
                    variant={feedbackGiven === "negative" ? "destructive" : "outline"}
                    onClick={() => {
                      setFeedbackGiven("negative")
                      void submitFeedback(prompt.id, "negative")
                    }}
                    disabled={feedbackGiven !== null || isPending}
                  >
                    <ThumbsDown className="mr-1 h-3.5 w-3.5" />
                    {feedbackGiven === "negative" ? "已评" : "👎"}
                  </Button>
                  {prompt.status !== "archived" && (
                    <Button size="sm" variant="outline" onClick={handleArchive} disabled={isPending}>
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      归档
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={confirmDelete ? "destructive" : "outline"}
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {confirmDelete ? "确认删除" : "删除"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">System</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[260px] font-mono text-sm"
                />
              ) : (
                <div className="max-w-[72ch] whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-[15px] leading-[1.75] text-foreground">
                  {prompt.content}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="mb-8">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Versions</h3>
            <VersionList promptId={prompt.id} currentContent={prompt.content} />
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Tests</h3>
            <TestCaseSection promptId={prompt.id} initialTestCases={initialTestCases} />
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Modules</h3>
            <ModuleSuggestions promptId={prompt.id} promptContent={prompt.content} />
          </section>

          <section>
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Similar scenarios
            </h3>
            <ScenarioSuggestions promptContent={prompt.content} />
          </section>
        </div>
      </div>
    </div>
  )
}

function MetaCard({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: string }>
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground">{row.label}</span>
            <span className="text-right text-[13px] text-foreground">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

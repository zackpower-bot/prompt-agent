"use client"

import { useState, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Copy, Check, Clock, Tag, Pencil, Trash2, Archive, Save, X, ThumbsUp, ThumbsDown } from "lucide-react"
import { updatePrompt, deletePrompt } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"
import { createVersion } from "@/app/actions/version.actions"
import { VersionList } from "@/components/prompts/version-list"
import { submitFeedback } from "@/app/actions/feedback.actions"

interface Props {
  prompt: PromptWithTags
}

export function PromptDetailClient({ prompt: initialPrompt }: Props) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(initialPrompt)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)

  // Edit form state
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
  }, [prompt.content])

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean)
      const result = await updatePrompt(prompt.id, {
        title, description, content, category, tags, status,
      })
      if (result.success) {
        await createVersion(prompt.id)
        setPrompt(result.data)
        setEditing(false)
      }
    })
  }, [prompt.id, title, description, content, category, status, tagsInput])

  const handleDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return }
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
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/prompts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      {/* Header */}
      <div className="mb-6">
        {editing ? (
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mb-2 text-xl font-bold" />
        ) : (
          <h1 className="text-2xl font-bold">{prompt.title}</h1>
        )}

        {editing ? (
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="描述..." className="mt-2" />
        ) : prompt.description ? (
          <p className="mt-2 text-muted-foreground">{prompt.description}</p>
        ) : null}

        {editing ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="分类" className="w-full sm:w-32" />
            <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
              <option value="inbox">收件箱</option>
              <option value="production">生产</option>
              <option value="archived">归档</option>
            </select>
            <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="标签（逗号分隔）" className="flex-1" />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : prompt.status}
            </Badge>
            <Badge variant="outline">{prompt.category}</Badge>
            <Badge variant="outline">{prompt.model}</Badge>
            {prompt.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="mr-1 h-2.5 w-2.5" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />创建于 {formatDate(prompt.createdAt)}</span>
          <span>更新于 {formatDate(prompt.updatedAt)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save className="mr-1 h-3.5 w-3.5" />{isPending ? "保存中..." : "保存"}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="mr-1 h-3.5 w-3.5" />取消</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />编辑
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? "已复制" : "复制"}
            </Button>
            <Button
              size="sm"
              variant={feedbackGiven === "positive" ? "default" : "outline"}
              onClick={() => { setFeedbackGiven("positive"); void submitFeedback(prompt.id, "positive") }}
              disabled={feedbackGiven !== null || isPending}
            >
              <ThumbsUp className="mr-1 h-3.5 w-3.5" />
              {feedbackGiven === "positive" ? "已评" : "👍"}
            </Button>
            <Button
              size="sm"
              variant={feedbackGiven === "negative" ? "destructive" : "outline"}
              onClick={() => { setFeedbackGiven("negative"); void submitFeedback(prompt.id, "negative") }}
              disabled={feedbackGiven !== null || isPending}
            >
              <ThumbsDown className="mr-1 h-3.5 w-3.5" />
              {feedbackGiven === "negative" ? "已评" : "👎"}
            </Button>
            {prompt.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={handleArchive} disabled={isPending}>
                <Archive className="mr-1 h-3.5 w-3.5" />归档
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

      <Separator className="mb-6" />

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">提示词内容</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[200px] sm:min-h-[300px] font-mono text-sm" />
          ) : (
            <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 font-mono text-sm leading-relaxed">
              {prompt.content}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium">版本历史</h3>
        <VersionList promptId={prompt.id} currentContent={prompt.content} />
      </div>
    </div>
  )
}

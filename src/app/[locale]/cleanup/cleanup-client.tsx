"use client"

import { useState, useCallback, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react"
import { updatePrompt } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"

interface Suggestion {
  id: string
  title?: string
  description?: string
  category?: string
  tags?: string[]
  qualityScore?: number
  riskLevel?: string
  status: "pending" | "analyzing" | "done" | "error" | "applied"
  error?: string
}

export function CleanupClient({ prompts }: { prompts: PromptWithTags[] }) {
  const [suggestions, setSuggestions] = useState<Map<string, Suggestion>>(new Map())
  const [analyzing, setAnalyzing] = useState(false)
  const [current, setCurrent] = useState(0)
  const [isPending, startTransition] = useTransition()

  const analyzeOne = useCallback(async (prompt: PromptWithTags): Promise<Suggestion> => {
    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags,
          category: prompt.category,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        return { id: prompt.id, status: "error", error: data.error || `HTTP ${res.status}` }
      }

      const data = await res.json()
      const c = data.classification || {}
      return {
        id: prompt.id,
        title: c.title as string | undefined,
        description: c.description as string | undefined,
        category: c.category as string | undefined,
        tags: c.tags as string[] | undefined,
        qualityScore: c.qualityScore as number | undefined,
        riskLevel: c.riskLevel as string | undefined,
        status: "done",
      }
    } catch (e) {
      return { id: prompt.id, status: "error", error: (e as Error).message }
    }
  }, [])

  const startBatchAnalysis = useCallback(async () => {
    setAnalyzing(true)
    for (let i = 0; i < prompts.length; i++) {
      setCurrent(i)
      const prompt = prompts[i]

      setSuggestions(prev => {
        const next = new Map(prev)
        next.set(prompt.id, { id: prompt.id, status: "analyzing" })
        return next
      })

      const result = await analyzeOne(prompt)

      setSuggestions(prev => {
        const next = new Map(prev)
        next.set(prompt.id, result)
        return next
      })

      // Small delay between requests to avoid rate limiting
      if (i < prompts.length - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    setAnalyzing(false)
  }, [prompts, analyzeOne])

  const applySuggestion = useCallback((promptId: string) => {
    const suggestion = suggestions.get(promptId)
    if (!suggestion || suggestion.status !== "done") return

    startTransition(async () => {
      const result = await updatePrompt(promptId, {
        ...(suggestion.title && { title: suggestion.title }),
        ...(suggestion.description && { description: suggestion.description }),
        ...(suggestion.category && { category: suggestion.category }),
        ...(suggestion.tags && { tags: suggestion.tags }),
      })
      if (result.success) {
        setSuggestions(prev => {
          const next = new Map(prev)
          next.set(promptId, { ...suggestion, status: "applied" })
          return next
        })
      }
    })
  }, [suggestions])

  const doneCount = [...suggestions.values()].filter(s => s.status === "done" || s.status === "applied").length
  const errorCount = [...suggestions.values()].filter(s => s.status === "error").length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/prompts" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />返回列表
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">批量清洗</h1>
          <p className="text-sm text-muted-foreground">
            Agent 自动分析 {prompts.length} 条提示词，建议标题、描述、标签、分类
          </p>
        </div>
        <Button onClick={startBatchAnalysis} disabled={analyzing}>
          {analyzing ? (
            <><Loader2 className="mr-1 h-4 w-4 animate-spin" />分析中 ({current + 1}/{prompts.length})</>
          ) : (
            <><Sparkles className="mr-1 h-4 w-4" />开始分析</>
          )}
        </Button>
      </div>

      {(doneCount > 0 || errorCount > 0) && (
        <div className="mb-4 flex gap-3 text-sm">
          <Badge variant="secondary">{doneCount} 完成</Badge>
          {errorCount > 0 && <Badge variant="destructive">{errorCount} 失败</Badge>}
        </div>
      )}

      <Separator className="mb-6" />

      <div className="space-y-3">
        {prompts.map(prompt => {
          const suggestion = suggestions.get(prompt.id)
          return (
            <Card key={prompt.id} className={suggestion?.status === "applied" ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{prompt.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {prompt.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                      {prompt.tags.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">无标签</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {suggestion?.status === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {suggestion?.status === "done" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => applySuggestion(prompt.id)} disabled={isPending}>
                        <Check className="mr-1 h-3 w-3" />应用
                      </Button>
                    )}
                    {suggestion?.status === "applied" && <Badge variant="secondary" className="text-[10px]">已应用</Badge>}
                    {suggestion?.status === "error" && <Badge variant="destructive" className="text-[10px]">失败</Badge>}
                  </div>
                </div>
              </CardHeader>
              {suggestion?.status === "done" && (
                <CardContent className="pt-0">
                  <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
                    {suggestion.title && suggestion.title !== prompt.title && (
                      <div><span className="text-muted-foreground">标题:</span> {suggestion.title}</div>
                    )}
                    {suggestion.description && (
                      <div><span className="text-muted-foreground">描述:</span> {suggestion.description}</div>
                    )}
                    {suggestion.category && (
                      <div><span className="text-muted-foreground">分类:</span> {suggestion.category}</div>
                    )}
                    {suggestion.tags && (
                      <div><span className="text-muted-foreground">标签:</span> {suggestion.tags.join(", ")}</div>
                    )}
                    {suggestion.qualityScore !== undefined && (
                      <div><span className="text-muted-foreground">质量:</span> {(suggestion.qualityScore * 100).toFixed(0)}%</div>
                    )}
                  </div>
                </CardContent>
              )}
              {suggestion?.status === "error" && (
                <CardContent className="pt-0">
                  <p className="text-xs text-destructive">{suggestion.error}</p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

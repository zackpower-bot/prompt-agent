"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Blocks, Loader2, Sparkles, Check, Plus } from "lucide-react"
import { createModule } from "@/app/actions/module.actions"

const TYPE_LABELS: Record<string, string> = {
  role: "角色",
  goal: "目标",
  constraint: "约束",
  output_format: "输出格式",
  style: "风格",
  self_check: "自检",
}

interface Suggestion {
  type: string
  title: string
  content: string
}

interface Props {
  promptId: string
  promptContent: string
}

export function ModuleSuggestions({ promptId, promptContent }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [created, setCreated] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()

  const analyze = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agent/suggest-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: promptContent }),
      })
      const data = await res.json()
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setAnalyzed(true)
    }
  }, [promptContent])

  useEffect(() => {
    if (!analyzed && !loading) {
      void analyze()
    }
  }, [analyzed, loading, analyze])

  const handleCreate = useCallback((index: number, suggestion: Suggestion) => {
    startTransition(async () => {
      const result = await createModule({
        title: suggestion.title,
        content: suggestion.content,
        type: suggestion.type,
      })
      if (result.success) {
        setCreated((prev) => new Set([...prev, index]))
      }
    })
  }, [])

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Blocks className="h-4 w-4" />
          模块拆解
        </h3>
        {!analyzed && (
          <Button size="sm" variant="outline" onClick={analyze} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-1 h-3 w-3 animate-spin" />分析中</>
            ) : (
              <><Sparkles className="mr-1 h-3 w-3" />分析可复用模块</>
            )}
          </Button>
        )}
      </div>

      {analyzed && suggestions.length === 0 && (
        <p className="text-xs text-muted-foreground">未发现可复用的模块片段</p>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <Card key={i} className={created.has(i) ? "opacity-60" : ""}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="mono-label">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </Badge>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {s.content}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={created.has(i) ? "ghost" : "outline"}
                    className="shrink-0 h-7 text-xs"
                    onClick={() => handleCreate(i, s)}
                    disabled={created.has(i) || isPending}
                  >
                    {created.has(i) ? (
                      <><Check className="mr-1 h-3 w-3" />已创建</>
                    ) : (
                      <><Plus className="mr-1 h-3 w-3" />创建模块</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

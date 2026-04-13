"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, Save, Loader2, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react"
import { useState, useCallback } from "react"
import type { AgentResult, TrajectoryStep } from "@/hooks/use-agent-stream"
import { submitFeedback } from "@/app/actions/feedback.actions"

interface ResultViewProps {
  result: AgentResult
  steps: TrajectoryStep[]
  userMessage: string
  onSaved?: (promptId: string) => void
}

export function ResultView({ result, steps, userMessage, onSaved }: ResultViewProps) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPromptId, setSavedPromptId] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)
  const [qualityCheck, setQualityCheck] = useState<{ score: number; warning: string; suggestions: string[] } | null>(null)
  const [qualityChecking, setQualityChecking] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result.text])

  const doSave = useCallback(async () => {
    if (saving || saved) return
    setSaving(true)

    // Extract classification from classify_prompt tool result in trajectory
    let classification: Record<string, unknown> = {}
    for (const step of steps) {
      if (step.phase === "observation" && step.data) {
        const data = step.data as Record<string, unknown>
        if (data.toolName === "classify_prompt" || (typeof data.title === "string")) {
          classification = data
          break
        }
      }
      // Also check if the observation content is JSON from classify_prompt
      if (step.phase === "observation" && step.tool === "classify_prompt") {
        try {
          classification = JSON.parse(step.content)
        } catch {
          // not JSON, skip
        }
      }
    }

    try {
      const response = await fetch("/api/agent/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: result.text,
          classification,
          trajectory: steps,
          provider: result.provider,
          model: result.model,
          userMessage,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSaved(true)
        setSavedPromptId(data.promptId)
        onSaved?.(data.promptId)
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }, [result, steps, userMessage, saving, saved, onSaved])

  const handleSave = useCallback(async () => {
    if (saving || saved) return

    // If quality already checked and user chose to force save, skip check
    if (qualityCheck) {
      await doSave()
      return
    }

    // Check quality first
    setQualityChecking(true)
    try {
      const res = await fetch("/api/agent/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: result.text }),
      })
      const assessment = await res.json()

      if (assessment.passed) {
        await doSave()
      } else {
        setQualityCheck({
          score: assessment.score,
          warning: assessment.warning,
          suggestions: assessment.suggestions,
        })
      }
    } catch {
      // If quality check fails, allow save anyway
      await doSave()
    } finally {
      setQualityChecking(false)
    }
  }, [saving, saved, qualityCheck, result.text, doSave])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">生成结果</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              {result.provider} / {result.model}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {result.usage.inputTokens + result.usage.outputTokens} tokens
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button
              variant={saved ? "ghost" : "default"}
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={saving || saved || qualityChecking}
            >
              {saving || qualityChecking ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : saved ? (
                <Check className="mr-1 h-3 w-3" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              {saved ? "已保存" : qualityChecking ? "检查中..." : "保存"}
            </Button>
            <Button
              variant={feedbackGiven === "positive" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={async () => {
                setFeedbackGiven("positive")
                if (savedPromptId) {
                  await submitFeedback(savedPromptId, "positive")
                }
              }}
              disabled={feedbackGiven !== null}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant={feedbackGiven === "negative" ? "destructive" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={async () => {
                setFeedbackGiven("negative")
                if (savedPromptId) {
                  await submitFeedback(savedPromptId, "negative")
                }
              }}
              disabled={feedbackGiven !== null}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {result.text}
        </div>
      </CardContent>
      {qualityCheck && !saved && (
        <div className="border-t px-6 py-4 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{qualityCheck.warning}</p>
              {qualityCheck.suggestions.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  {qualityCheck.suggestions.map((s, i) => <li key={i}>· {s}</li>)}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setQualityCheck(null) }}>
                  返回修改
                </Button>
                <Button size="sm" onClick={async () => { await doSave() }}>
                  仍然保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

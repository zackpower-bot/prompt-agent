"use client"

import { useCallback, useState } from "react"
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react"
import { submitFeedback } from "@/app/actions/feedback.actions"
import { Button } from "@/components/ui/button"
import type { AgentResult, TrajectoryStep } from "@/hooks/use-agent-stream"
import type { ResultQualitySignal, SimilarPrompt } from "@/components/agent/result-details-drawer"
import { toast } from "sonner"

interface ResultActionsProps {
  result: AgentResult | null
  steps: TrajectoryStep[]
  userMessage: string
  outputText: string
  onQualityResult: (signal: ResultQualitySignal | null) => void
  onSimilarPrompts: (items: SimilarPrompt[]) => void
}

function extractClassification(steps: TrajectoryStep[]) {
  for (const step of steps) {
    if (step.phase === "observation" && step.data && (step.data.toolName === "classify_prompt" || typeof step.data.title === "string")) {
      return step.data
    }

    if (step.phase === "observation" && step.tool === "classify_prompt") {
      try {
        return JSON.parse(step.content) as Record<string, unknown>
      } catch {
        return {}
      }
    }
  }

  return {}
}

export function ResultActions({
  result,
  steps,
  userMessage,
  outputText,
  onQualityResult,
  onSimilarPrompts,
}: ResultActionsProps) {
  const [saving, setSaving] = useState(false)
  const [savedPromptId, setSavedPromptId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null)

  const canSave = Boolean(result?.text)

  const handleCopy = useCallback(async () => {
    if (!outputText.trim()) return
    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [outputText])

  const saveResult = useCallback(async () => {
    if (!result?.text) throw new Error("缺少可保存的内容")

    const classification = extractClassification(steps)
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

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error ?? "保存失败")
    }

    return data.promptId as string
  }, [result, steps, userMessage])

  const runQualityCheck = useCallback(
    async (title?: string) => {
      if (!result?.text) return
      try {
        const response = await fetch("/api/agent/quality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: result.text, title }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error ?? "quality failed")

        const signal: ResultQualitySignal = {
          score: typeof data.score === "number" ? data.score : -1,
          passed: Boolean(data.passed),
          warning: typeof data.warning === "string" ? data.warning : null,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        }

        onQualityResult(signal)

        if (!signal.passed || signal.warning) {
          toast.warning("质量检查提醒", {
            description: signal.warning ?? "质量检查未通过，请复核提示词草稿。",
            duration: 4000,
          })
        }
      } catch {
        onQualityResult(null)
        toast.error("质量检查失败", { description: "可稍后在详情里重新触发。", duration: 3000 })
      }
    },
    [onQualityResult, result]
  )

  const runDedupCheck = useCallback(
    async (excludeId: string, title?: string) => {
      if (!result?.text) return
      try {
        const response = await fetch("/api/agent/dedup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title ?? "",
            content: result.text,
            excludeId,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error ?? "dedup failed")
        }

        const duplicates = Array.isArray(data.duplicates) ? (data.duplicates as SimilarPrompt[]) : []
        onSimilarPrompts(duplicates)
      } catch {
        onSimilarPrompts([])
      }
    },
    [onSimilarPrompts, result]
  )

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return

    setSaving(true)
    try {
      const promptId = await saveResult()
      setSavedPromptId(promptId)
      setFeedbackGiven(null)
      toast.success("已保存到提示词资产库", {
        duration: 3000,
        action: {
          label: "查看",
          onClick: () => {
            window.location.assign(`/prompts/${promptId}`)
          },
        },
      })

      const classification = extractClassification(steps)
      const title = typeof classification.title === "string" ? classification.title : undefined
      void runQualityCheck(title)
      void runDedupCheck(promptId, title)
    } catch (error) {
      toast.error((error as Error).message, { duration: 3000 })
    } finally {
      setSaving(false)
    }
  }, [canSave, runDedupCheck, runQualityCheck, saveResult, saving, steps])

  const handleFeedback = useCallback(
    async (type: "positive" | "negative") => {
      if (!savedPromptId || feedbackGiven) return

      setFeedbackGiven(type)
      const response = await submitFeedback(savedPromptId, type)
      if (!response.success) {
        setFeedbackGiven(null)
        toast.error(response.error ?? "反馈提交失败", { duration: 3000 })
      }
    },
    [feedbackGiven, savedPromptId]
  )

  const saveLabel = savedPromptId ? "已保存" : saving ? "保存中..." : "保存"

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="result-actions">
      <Button onClick={handleSave} disabled={!canSave || saving || Boolean(savedPromptId)}>
        {saveLabel}
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          disabled={!outputText.trim()}
          aria-label="复制结果"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>

        <Button
          variant={feedbackGiven === "positive" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleFeedback("positive")}
          disabled={!savedPromptId || feedbackGiven !== null}
          aria-label="点赞当前结果"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>

        <Button
          variant={feedbackGiven === "negative" ? "destructive" : "ghost"}
          size="icon"
          onClick={() => handleFeedback("negative")}
          disabled={!savedPromptId || feedbackGiven !== null}
          aria-label="点踩当前结果"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

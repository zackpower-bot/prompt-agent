"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, Save, Loader2 } from "lucide-react"
import { useState, useCallback } from "react"
import type { AgentResult, TrajectoryStep } from "@/hooks/use-agent-stream"

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

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result.text])

  const handleSave = useCallback(async () => {
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
        onSaved?.(data.promptId)
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }, [result, steps, userMessage, saving, saved, onSaved])

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
              disabled={saving || saved}
            >
              {saving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : saved ? (
                <Check className="mr-1 h-3 w-3" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              {saved ? "已保存" : "保存"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {result.text}
        </div>
      </CardContent>
    </Card>
  )
}

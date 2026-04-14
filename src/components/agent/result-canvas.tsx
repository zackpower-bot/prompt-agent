"use client"

import { Loader2 } from "lucide-react"
import type { AgentResult } from "@/hooks/use-agent-stream"
import type { SimilarPrompt } from "@/components/agent/result-details-drawer"

interface ResultCanvasProps {
  result: AgentResult | null
  streamingText: string
  isStreaming: boolean
  duplicates: SimilarPrompt[]
  onShowDuplicates: () => void
}

export function ResultCanvas({
  result,
  streamingText,
  isStreaming,
  duplicates,
  onShowDuplicates,
}: ResultCanvasProps) {
  const text = result?.text ?? streamingText
  const hasContent = Boolean(text.trim())
  const providerLabel = result ? `${result.provider}/${result.model}` : "等待模型生成"
  const tokenLabel = result ? `${result.usage.inputTokens + result.usage.outputTokens} tokens` : "-- tokens"

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-border/60 bg-card/40 p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
        <span>由 {providerLabel} 生成</span>
        <span className="text-muted-foreground/70">路 {tokenLabel}</span>
      </div>

      {duplicates.length > 0 && (
        <button
          type="button"
          onClick={onShowDuplicates}
          className="mt-3 inline-flex items-center rounded-full border border-agent/30 bg-agent/10 px-3 py-1 text-xs font-semibold text-agent transition hover:border-agent/60"
        >
          找到 {duplicates.length} 条相似提示词 →
        </button>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {hasContent ? (
          <article className="prose prose-lg max-w-none whitespace-pre-wrap leading-8 text-foreground dark:prose-invert">
            {text}
          </article>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">运行完成后，这里会展示最新提示词草稿。</p>
        )}

        {isStreaming && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-agent">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>思考中，稍等片刻...</span>
          </div>
        )}
      </div>
    </section>
  )
}

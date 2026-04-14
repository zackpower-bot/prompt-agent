"use client"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { TrajectoryView } from "@/components/agent/trajectory-view"
import type { AgentResult, TrajectoryStep } from "@/hooks/use-agent-stream"

export interface SimilarPrompt {
  id: string
  title: string
  similarity: number
}

export interface ResultQualitySignal {
  score: number
  passed: boolean
  warning: string | null
  suggestions: string[]
}

interface ResultDetailsProps {
  result: AgentResult | null
  steps: TrajectoryStep[]
  qualitySignal: ResultQualitySignal | null
  similarPrompts: SimilarPrompt[]
}

export function ResultDetails({ result, steps, qualitySignal, similarPrompts }: ResultDetailsProps) {
  const metaRows = [
    { label: "Provider", value: result?.provider ?? "-" },
    { label: "Model", value: result?.model ?? "-" },
    { label: "输入 Tokens", value: result ? String(result.usage.inputTokens) : "-" },
    { label: "输出 Tokens", value: result ? String(result.usage.outputTokens) : "-" },
    { label: "Trajectory", value: result ? String(result.trajectoryCount) : String(steps.length) },
  ]

  return (
    <div className="space-y-6 text-sm leading-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">结果元数据</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {metaRows.map((row) => (
            <MetaItem key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">质量评估</p>
          {qualitySignal && (
            <Badge variant={qualitySignal.passed ? "secondary" : "destructive"}>
              {qualitySignal.score >= 0 ? `${Math.round(qualitySignal.score * 100)}%` : "未检测"}
            </Badge>
          )}
        </div>
        {qualitySignal ? (
          <div className="mt-3 rounded-2xl border border-border/60 bg-background px-4 py-4">
            <p className="text-sm text-foreground">
              {qualitySignal.warning ?? "已通过质量检查。"}
            </p>
            {qualitySignal.suggestions.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {qualitySignal.suggestions.map((suggestion) => (
                  <li key={suggestion}>· {suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">保存后会自动运行质量检查与去重流程。</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">相似提示词</p>
          {similarPrompts.length > 0 && <Badge variant="outline">{similarPrompts.length}</Badge>}
        </div>
        {similarPrompts.length > 0 ? (
          <div className="mt-3 space-y-3">
            {similarPrompts.map((prompt) => (
              <Link
                key={prompt.id}
                href={`/prompts/${prompt.id}`}
                className="block rounded-2xl border border-border/60 bg-background/80 px-4 py-3 transition hover:border-agent/60"
              >
                <p className="font-medium text-foreground">{prompt.title}</p>
                <p className="text-xs text-muted-foreground">相似度 {Math.round(prompt.similarity * 100)}%</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">尚未发现相似提示词。</p>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">执行轨迹</p>
        <div className="mt-3 rounded-2xl border border-border/60 bg-background/80 p-3">
          {steps.length > 0 ? (
            <TrajectoryView steps={steps} className="h-[320px]" />
          ) : (
            <p className="text-sm text-muted-foreground">暂无可展示的执行步骤。</p>
          )}
        </div>
      </section>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * Quality gate — evaluates prompt quality before save.
 * Returns quality score + warning if below threshold.
 */

import { runAgent } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"
import { buildSystemPrompt } from "@/agent/prompt-builder"
import type { ProviderName } from "@/lib/providers"

const QUALITY_THRESHOLD = 0.7

export interface QualityAssessment {
  score: number
  passed: boolean
  warning: string | null
  suggestions: string[]
  classification: Record<string, unknown>
}

export async function assessQuality(
  content: string,
  title?: string,
  opts?: { preferredChain?: Array<{ provider: ProviderName; model?: string }> }
): Promise<QualityAssessment> {
  try {
    const systemPrompt = await buildSystemPrompt("analysis", content)

    const result = await runAgent({
      systemPrompt,
      userMessage: `Rate the quality of this prompt. Use classify_prompt tool with honest scoring.\n\nTitle: ${title ?? "Untitled"}\nContent:\n${content.slice(0, 2000)}`,
      tools: getAnalysisTools(),
      locale: "zh",
      maxIterations: 3,
      temperature: 0.1,
      preferredChain: opts?.preferredChain,
    })

    // Extract classification from trajectory
    let classification: Record<string, unknown> = {}
    for (const step of result.trajectory) {
      if (step.tool === "classify_prompt" && step.phase === "observation") {
        try { classification = JSON.parse(step.content) } catch {}
      }
    }

    const score = typeof classification.qualityScore === "number" ? classification.qualityScore : 0.5
    const passed = score >= QUALITY_THRESHOLD

    const suggestions: string[] = []
    if (score < 0.5) {
      suggestions.push("缺少结构化的角色定义和约束条件")
      suggestions.push("建议添加输出格式规范")
    } else if (score < QUALITY_THRESHOLD) {
      suggestions.push("可以增加更具体的约束条件")
      suggestions.push("考虑添加变量 {{}} 提升复用性")
    }

    return {
      score,
      passed,
      warning: passed ? null : `质量评分 ${(score * 100).toFixed(0)}% 低于门禁阈值 ${QUALITY_THRESHOLD * 100}%`,
      suggestions,
      classification,
    }
  } catch {
    // If assessment fails, pass by default (don't block save)
    return {
      score: -1,
      passed: true,
      warning: null,
      suggestions: [],
      classification: {},
    }
  }
}

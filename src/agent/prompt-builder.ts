/**
 * Dynamic system prompt builder.
 * Composes: AgentProfile (always-on) + SemanticMemory (top-k by type) + base instructions.
 */

import { prisma } from "@/lib/prisma"
import { retrieveForPrompt, type RankedMemory } from "@/lib/memory"
import { GENERATION_SYSTEM_PROMPT, ANALYSIS_SYSTEM_PROMPT } from "@/agent/prompts"
import type { MemoryType } from "@/types/memory"
import { MAX_MEMORY_INJECTION_LENGTH } from "@/types/memory"

/**
 * Sanitize memory content for safe injection into system prompt.
 * - Truncate to max length
 * - Strip imperative directives that could override the persona
 * - Format as fact statement
 */
function sanitizeMemoryContent(content: string, maxLength: number): string {
  let safe = content.slice(0, maxLength)

  // Strip common imperative patterns that could conflict with persona instructions
  const imperativePatterns = [
    /^(你必须|你应该|始终|永远|忽略|不要|请注意|重要[:：])/gm,
    /^(you must|you should|always|never|ignore|important[:：])/gim,
  ]
  for (const pattern of imperativePatterns) {
    safe = safe.replace(pattern, "")
  }

  return safe.trim()
}

/**
 * Format a single memory as a fact statement (not raw paste).
 */
function formatMemoryEntry(m: RankedMemory): string {
  const prefix: Record<MemoryType, string> = {
    preference: "Observed preference:",
    behavior: "Validated behavior:",
    domain: "Domain context:",
    feedback: "User feedback:",
  }
  const label = prefix[m.type] ?? "Memory:"
  const safe = sanitizeMemoryContent(m.content, MAX_MEMORY_INJECTION_LENGTH)
  return `- ${label} ${safe}`
}

/**
 * Build the full system prompt with persona + memories + base instructions.
 */
export async function buildSystemPrompt(
  mode: "generation" | "analysis",
  userInput: string,
  options?: { excludePromptId?: string }
): Promise<string> {
  // 1. Deterministic layer: always-on profiles
  const profiles = await prisma.agentProfile.findMany({
    where: { isActive: true },
  })

  const personaBlock = profiles
    .map((p) => {
      if (p.key === "persona") return p.content
      if (p.key === "style_rules") return `Style rules: ${p.content}`
      if (p.key === "default_language") return `Default language: ${p.content}`
      return p.content
    })
    .filter(Boolean)
    .join("\n\n")

  // 2. Semantic layer: retrieve relevant memories by type
  const memories = await retrieveForPrompt(userInput, options?.excludePromptId)

  const memoryBlocks: string[] = []

  const preferenceEntries = memories.preference.map(formatMemoryEntry)
  if (preferenceEntries.length > 0) {
    memoryBlocks.push(`## User Preferences\n${preferenceEntries.join("\n")}`)
  }

  const behaviorEntries = memories.behavior.map(formatMemoryEntry)
  if (behaviorEntries.length > 0) {
    memoryBlocks.push(`## Behavioral Patterns\n${behaviorEntries.join("\n")}`)
  }

  const contextEntries = [
    ...memories.domain.map(formatMemoryEntry),
    ...memories.feedback.map(formatMemoryEntry),
  ]
  if (contextEntries.length > 0) {
    memoryBlocks.push(`## Relevant Context\n${contextEntries.join("\n")}`)
  }

  // 3. Base instructions (existing prompt)
  const basePrompt = mode === "generation" ? GENERATION_SYSTEM_PROMPT : ANALYSIS_SYSTEM_PROMPT

  // 4. Compose
  const parts: string[] = []

  if (personaBlock) {
    parts.push(`## Your Identity\n${personaBlock}`)
  }

  if (memoryBlocks.length > 0) {
    parts.push(memoryBlocks.join("\n\n"))
  }

  parts.push(basePrompt)

  return parts.join("\n\n---\n\n")
}

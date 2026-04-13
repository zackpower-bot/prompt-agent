import OpenAI from "openai"
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions"
import { createClient, getDefaultProvider, getAvailableProviders, PROVIDER_CONFIGS } from "@/lib/providers"
import type { ProviderName } from "@/lib/providers"

export type NarrationLocale = "zh" | "en"

export interface AgentTrajectoryStep {
  step: number
  phase: "thought" | "action" | "observation"
  content: string
  tool: string | null
  input: Record<string, unknown> | null
  data: Record<string, unknown> | null
  timestamp: string
}

export interface AgentToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>, locale: NarrationLocale) => Promise<string>
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface AgentRunOptions {
  systemPrompt: string
  userMessage: string
  history?: ChatMessage[]
  tools?: AgentToolDefinition[]
  provider?: ProviderName
  model?: string
  locale?: NarrationLocale
  maxIterations?: number
  temperature?: number
  onStep?: (step: AgentTrajectoryStep) => void
  onToken?: (token: string) => void
}

export interface AgentRunResult {
  text: string
  trajectory: AgentTrajectoryStep[]
  provider: ProviderName
  model: string
  usage: { inputTokens: number; outputTokens: number }
}

const MAX_ITERATIONS = 8

function pushStep(
  trajectory: AgentTrajectoryStep[],
  phase: AgentTrajectoryStep["phase"],
  content: string,
  tool: string | null = null,
  input: Record<string, unknown> | null = null,
  data: Record<string, unknown> | null = null,
  onStep?: (step: AgentTrajectoryStep) => void
): void {
  const step: AgentTrajectoryStep = {
    step: trajectory.length + 1,
    phase,
    content,
    tool,
    input,
    data,
    timestamp: new Date().toISOString(),
  }
  trajectory.push(step)
  onStep?.(step)
}

function buildOpenAITools(tools: AgentToolDefinition[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Strip MiniMax <think>...</think> tags from content.
 * Returns { thinking, output } where thinking is the content inside <think> tags.
 */
export function parseThinkingContent(text: string): { thinking: string; output: string } {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/)
  const thinking = thinkMatch ? thinkMatch[1].trim() : ""
  const output = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
  return { thinking, output }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message
    return msg.includes("529") || msg.includes("429") || msg.includes("overloaded") || msg.includes("rate limit")
  }
  return false
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  try {
    return await runAgentInternal(options)
  } catch (error) {
    // On retryable error, try fallback providers
    if (isRetryableError(error) && !options.provider) {
      const available = getAvailableProviders()
      const defaultProvider = getDefaultProvider()
      const fallbacks = available.filter((p) => p !== defaultProvider)

      for (const fallback of fallbacks) {
        try {
          const result = await runAgentInternal({ ...options, provider: fallback })
          return result
        } catch (fallbackError) {
          if (!isRetryableError(fallbackError)) throw fallbackError
        }
      }
    }
    throw error
  }
}

async function runAgentInternal(options: AgentRunOptions): Promise<AgentRunResult> {
  const {
    systemPrompt,
    userMessage,
    tools = [],
    locale = "zh",
    maxIterations = MAX_ITERATIONS,
    temperature = 0.2,
    onStep,
  } = options

  const providerName = options.provider ?? getDefaultProvider()
  const config = PROVIDER_CONFIGS[providerName]
  const modelName = options.model ?? config.defaultModel
  const client = createClient(providerName)

  if (!client) {
    return {
      text: locale === "zh" ? `未配置 ${config.label} API 密钥。` : `${config.label} API key not configured.`,
      trajectory: [],
      provider: providerName,
      model: modelName,
      usage: { inputTokens: 0, outputTokens: 0 },
    }
  }

  const historyMessages: ChatCompletionMessageParam[] = (options.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userMessage },
  ]

  const openaiTools = tools.length > 0 ? buildOpenAITools(tools) : undefined
  const trajectory: AgentTrajectoryStep[] = []
  let totalInput = 0
  let totalOutput = 0

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Use streaming to provide real-time token updates
    const stream = await client.chat.completions.create({
      model: modelName,
      temperature,
      messages,
      tools: openaiTools,
      tool_choice: openaiTools ? "auto" : undefined,
      stream: true,
      stream_options: { include_usage: true },
    })

    let rawContent = ""
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>()
    let lastStreamedThinking = ""

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta

      // Accumulate content
      if (delta?.content) {
        rawContent += delta.content
        options.onToken?.(delta.content)

        // Stream thinking content in real-time
        const { thinking } = parseThinkingContent(rawContent)
        if (thinking && thinking !== lastStreamedThinking) {
          lastStreamedThinking = thinking
        }
      }

      // Accumulate tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = toolCallsMap.get(tc.index) ?? { id: "", name: "", arguments: "" }
          if (tc.id) existing.id = tc.id
          if (tc.function?.name) existing.name = tc.function.name
          if (tc.function?.arguments) existing.arguments += tc.function.arguments
          toolCallsMap.set(tc.index, existing)
        }
      }

      // Usage from final chunk
      if (chunk.usage) {
        totalInput += chunk.usage.prompt_tokens ?? 0
        totalOutput += chunk.usage.completion_tokens ?? 0
      }
    }

    // Build message from streamed data
    const toolCalls = toolCallsMap.size > 0
      ? [...toolCallsMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, tc]) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          }))
      : undefined

    if (!rawContent && !toolCalls) break

    // Parse thinking content
    if (rawContent) {
      const { thinking, output } = parseThinkingContent(rawContent)
      if (thinking) {
        pushStep(trajectory, "thought", thinking, null, null, null, onStep)
      }
      if (output && !toolCalls?.length) {
        return {
          text: output,
          trajectory,
          provider: providerName,
          model: modelName,
          usage: { inputTokens: totalInput, outputTokens: totalOutput },
        }
      }
    }

    // Handle tool calls (from streamed accumulation)
    const accumulatedToolCalls = toolCalls ?? []
    if (accumulatedToolCalls.length === 0 && rawContent) {
      return {
        text: parseThinkingContent(rawContent).output || rawContent,
        trajectory,
        provider: providerName,
        model: modelName,
        usage: { inputTokens: totalInput, outputTokens: totalOutput },
      }
    }

    if (accumulatedToolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: rawContent || null,
        tool_calls: accumulatedToolCalls,
      })

      for (const toolCall of accumulatedToolCalls) {
        if (toolCall.type !== "function") continue
        const toolName = toolCall.function.name
        const toolDef = tools.find((t) => t.name === toolName)

        const args = safeJsonParse<Record<string, unknown>>(toolCall.function.arguments, {})

        pushStep(
          trajectory,
          "action",
          locale === "zh"
            ? `调用工具 ${toolName}(${JSON.stringify(args)})`
            : `Calling tool ${toolName}(${JSON.stringify(args)})`,
          toolName,
          args,
          null,
          onStep
        )

        let result: string
        if (toolDef) {
          try {
            result = await toolDef.execute(args, locale)
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error"
            result = locale === "zh" ? `工具 ${toolName} 执行失败：${msg}` : `Tool ${toolName} failed: ${msg}`
          }
        } else {
          result = locale === "zh" ? `未知工具：${toolName}` : `Unknown tool: ${toolName}`
        }

        pushStep(trajectory, "observation", result, toolName, null, { toolName, args }, onStep)

        const toolMessage: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        }
        messages.push(toolMessage)
      }
    }
  }

  // Iteration limit reached
  return {
    text: locale === "zh" ? "Agent 达到最大迭代次数。" : "Agent reached maximum iterations.",
    trajectory,
    provider: providerName,
    model: modelName,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  }
}

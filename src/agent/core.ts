import OpenAI from "openai"
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions"
import { createClient, getDefaultProvider, getAvailableProviders, PROVIDER_CONFIGS } from "@/lib/providers"
import type { ProviderName } from "@/lib/providers"
import { logUsage } from "@/lib/usage"

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
  preferredChain?: Array<{ provider: ProviderName; model?: string }>
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
  if (!(error instanceof Error)) return false
  const msg = error.message
  // Provider overload / rate limit (MiniMax 529, OpenAI 429, generic text indicators)
  if (/\b(429|529)\b/.test(msg)) return true
  if (/\b(overloaded|rate[- _]?limit|too many requests)\b/i.test(msg)) return true
  // Provider-side 5xx (internal / bad gateway / service unavailable / gateway timeout)
  if (/\b(500|502|503|504)\b/.test(msg)) return true
  // Network-level (timeouts, DNS, connection reset/refused, generic fetch failures)
  if (/\b(timed?[-_ ]?out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|network error)\b/i.test(msg)) return true
  return false
}

function extractErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/\b(\d{3}|[a-z_]+)\b/i)
    return match?.[1]?.toLowerCase() ?? error.message
  }
  if (typeof error === "string") return error
  return "unknown"
}

async function logLlmFailure(provider: ProviderName, model: string, error: unknown) {
  await logUsage({
    service: "llm",
    provider,
    model,
    inputTokens: 0,
    outputTokens: 0,
    success: false,
    errorCode: extractErrorCode(error),
  })
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const chain = options.preferredChain ?? []
  const primaryFromChain = chain[0]
  const effectiveOptions: AgentRunOptions = primaryFromChain
    ? {
        ...options,
        provider: options.provider ?? primaryFromChain.provider,
        model: options.model ?? primaryFromChain.model,
      }
    : options

  const initialProvider = effectiveOptions.provider ?? getDefaultProvider()
  const initialModel = effectiveOptions.model ?? PROVIDER_CONFIGS[initialProvider].defaultModel
  const availableProviders = getAvailableProviders()

  try {
    return await runAgentInternal(effectiveOptions)
  } catch (error) {
    await logLlmFailure(initialProvider, initialModel, error)
    if (isRetryableError(error)) {
      const fallbacks: Array<{ provider: ProviderName; model?: string }> =
        chain.length > 1
          ? chain.slice(1)
          : availableProviders
              .filter((provider) => provider !== initialProvider)
              .map((provider) => ({
                provider,
                model: PROVIDER_CONFIGS[provider].defaultModel,
              }))
      const primaryErrCode = extractErrorCode(error)
      console.log(
        `[agent] primary '${initialProvider}/${initialModel}' failed (${primaryErrCode}); fallback chain: ${
          fallbacks.map((entry) => `${entry.provider}/${entry.model ?? "(default)"}`).join(" -> ") || "(none)"
        }`
      )

      for (const fallback of fallbacks) {
        const fallbackProvider = fallback.provider
        const fallbackModel = fallback.model ?? PROVIDER_CONFIGS[fallbackProvider].defaultModel
        if (!availableProviders.includes(fallbackProvider)) {
          console.log(`[agent] fallback '${fallbackProvider}' skipped: key not configured`)
          continue
        }
        console.log(
          `[agent] fallback attempt: ${initialProvider}/${initialModel} -> ${fallbackProvider}/${fallbackModel}`
        )
        try {
          const result = await runAgentInternal({
            ...effectiveOptions,
            provider: fallbackProvider,
            model: fallbackModel,
          })
          console.log(
            `[agent] fallback SUCCESS on '${fallbackProvider}/${fallbackModel}' (primary was '${initialProvider}/${initialModel}', reason: ${primaryErrCode})`
          )
          return result
        } catch (fallbackError) {
          await logLlmFailure(fallbackProvider, fallbackModel, fallbackError)
          const fbCode = extractErrorCode(fallbackError)
          console.log(`[agent] fallback '${fallbackProvider}/${fallbackModel}' failed (${fbCode})`)
          if (!isRetryableError(fallbackError)) throw fallbackError
        }
      }
      console.log("[agent] all fallbacks exhausted")
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

  const createResult = (text: string): AgentRunResult => ({
    text,
    trajectory,
    provider: providerName,
    model: modelName,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  })

  const finalizeResult = async (text: string): Promise<AgentRunResult> => {
    const result = createResult(text)
    await logUsage({
      service: "llm",
      provider: providerName,
      model: modelName,
      inputTokens: totalInput,
      outputTokens: totalOutput,
    })
    return result
  }

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
        return finalizeResult(output)
      }
    }

    // Handle tool calls (from streamed accumulation)
    const accumulatedToolCalls = toolCalls ?? []
    if (accumulatedToolCalls.length === 0 && rawContent) {
      return finalizeResult(parseThinkingContent(rawContent).output || rawContent)
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
  return finalizeResult(locale === "zh" ? "Agent 达到最大迭代次数。" : "Agent reached maximum iterations.")
}

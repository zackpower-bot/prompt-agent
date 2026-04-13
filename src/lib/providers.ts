import OpenAI from "openai"

export type ProviderName = "minimax" | "openai" | "zhipu" | "gemini" | "kimi" | "deepseek"

interface ProviderConfig {
  name: ProviderName
  label: string
  baseURL: string
  defaultModel: string
  envKey: string
}

export const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  minimax: {
    name: "minimax",
    label: "MiniMax",
    baseURL: "https://api.minimax.chat/v1",
    defaultModel: "MiniMax-M2.7",
    envKey: "MINIMAX_API_KEY",
  },
  openai: {
    name: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    envKey: "OPENAI_API_KEY",
  },
  zhipu: {
    name: "zhipu",
    label: "智谱",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-plus",
    envKey: "ZHIPU_API_KEY",
  },
  gemini: {
    name: "gemini",
    label: "Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    envKey: "GEMINI_API_KEY",
  },
  kimi: {
    name: "kimi",
    label: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-auto",
    envKey: "KIMI_API_KEY",
  },
  deepseek: {
    name: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
  },
}

export function createClient(provider: ProviderName, timeout = 45_000): OpenAI | null {
  const config = PROVIDER_CONFIGS[provider]
  const apiKey = process.env[config.envKey]
  if (!apiKey) return null

  return new OpenAI({
    apiKey,
    baseURL: config.baseURL,
    timeout,
  })
}

export function getAvailableProviders(): ProviderName[] {
  return (Object.keys(PROVIDER_CONFIGS) as ProviderName[]).filter(
    (name) => !!process.env[PROVIDER_CONFIGS[name].envKey]
  )
}

export function getDefaultProvider(): ProviderName {
  const available = getAvailableProviders()
  return available[0] ?? "minimax"
}

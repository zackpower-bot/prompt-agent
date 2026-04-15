import type { ProviderName } from "./providers"

export type ModelTier = "free" | "cheap" | "mid" | "premium"

export interface AvailableModel {
  provider: ProviderName
  model: string
  label: string
  tier: ModelTier
  contextWindow: number
  description: string
}

export interface ModelChainEntry {
  provider: ProviderName
  model: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    provider: "minimax",
    model: "MiniMax-M2.7",
    label: "MiniMax M2.7",
    tier: "premium",
    contextWindow: 245000,
    description: "MiniMax 旗舰模型",
  },
  {
    provider: "zhipu",
    model: "glm-5.1",
    label: "GLM-5.1",
    tier: "premium",
    contextWindow: 200000,
    description: "最新旗舰",
  },
  {
    provider: "zhipu",
    model: "glm-5",
    label: "GLM-5",
    tier: "premium",
    contextWindow: 200000,
    description: "高智能基座",
  },
  {
    provider: "zhipu",
    model: "glm-4.7",
    label: "GLM-4.7",
    tier: "premium",
    contextWindow: 200000,
    description: "通用、推理、agent",
  },
  {
    provider: "zhipu",
    model: "glm-4.7-flashx",
    label: "GLM-4.7-FlashX",
    tier: "mid",
    contextWindow: 200000,
    description: "轻量高配",
  },
  {
    provider: "zhipu",
    model: "glm-4.7-flash",
    label: "GLM-4.7-Flash",
    tier: "free",
    contextWindow: 200000,
    description: "免费",
  },
  {
    provider: "zhipu",
    model: "glm-4.6",
    label: "GLM-4.6",
    tier: "premium",
    contextWindow: 200000,
    description: "超强性能",
  },
  {
    provider: "zhipu",
    model: "glm-4.5-air",
    label: "GLM-4.5-Air",
    tier: "mid",
    contextWindow: 128000,
    description: "高性价比",
  },
  {
    provider: "zhipu",
    model: "glm-4.5-airx",
    label: "GLM-4.5-AirX",
    tier: "mid",
    contextWindow: 128000,
    description: "速度敏感",
  },
  {
    provider: "zhipu",
    model: "glm-4.5-flash",
    label: "GLM-4.5-Flash",
    tier: "free",
    contextWindow: 128000,
    description: "免费（即将下线）",
  },
  {
    provider: "openai",
    model: "gpt-4o",
    label: "GPT-4o",
    tier: "premium",
    contextWindow: 128000,
    description: "OpenAI 主模型",
  },
  {
    provider: "gemini",
    model: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    tier: "mid",
    contextWindow: 1000000,
    description: "Google Gemini",
  },
  {
    provider: "kimi",
    model: "moonshot-v1-auto",
    label: "Kimi Moonshot",
    tier: "mid",
    contextWindow: 128000,
    description: "Moonshot 自动选型",
  },
  {
    provider: "deepseek",
    model: "deepseek-chat",
    label: "DeepSeek Chat",
    tier: "cheap",
    contextWindow: 64000,
    description: "DeepSeek V3",
  },
]

export const DEFAULT_CHAIN: ModelChainEntry[] = [
  { provider: "minimax", model: "MiniMax-M2.7" },
  { provider: "zhipu", model: "glm-4.5-air" },
]

export const ANALYSIS_DEFAULT_CHAIN: ModelChainEntry[] = [
  { provider: "zhipu", model: "glm-4.7-flash" },
  { provider: "zhipu", model: "glm-4.5-flash" },
  { provider: "minimax", model: "MiniMax-M2.7" },
]

export const TIER_LABEL: Record<ModelTier, string> = {
  free: "免费",
  cheap: "低价",
  mid: "中档",
  premium: "旗舰",
}

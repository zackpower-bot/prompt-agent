import { prisma } from "@/lib/prisma"
import { summarizeText } from "@/lib/utils"
import type { AgentToolDefinition, NarrationLocale } from "./core"

export const searchModulesTool: AgentToolDefinition = {
  name: "search_modules",
  description: "Search the saved prompt module library for reusable building blocks.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query for modules" },
    },
    required: ["query"],
  },
  execute: async (args, locale) => {
    const query = (args.query as string)?.trim()
    if (!query) return locale === "zh" ? "未提供搜索关键词。" : "No query provided."

    const modules = await prisma.module.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      take: 5,
    })

    if (modules.length === 0) {
      return locale === "zh"
        ? `未找到与"${query}"相关的模块。`
        : `No modules found for "${query}".`
    }

    return modules
      .map((m, i) => `${i + 1}. [${m.type}] ${m.title}\n   ${summarizeText(m.content, 150)}`)
      .join("\n\n")
  },
}

export const webSearchTool: AgentToolDefinition = {
  name: "web_search",
  description: "Search the web for relevant context, best practices, or terminology.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Focused web search query" },
    },
    required: ["query"],
  },
  execute: async (args, locale) => {
    const query = (args.query as string)?.trim()
    if (!query) return locale === "zh" ? "未提供搜索关键词。" : "No query provided."

    const apiKey = process.env.TAVILY_API_KEY
    if (!apiKey) {
      return locale === "zh"
        ? "网络搜索不可用（未配置 TAVILY_API_KEY）。"
        : "Web search unavailable (TAVILY_API_KEY not configured)."
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
      }),
    })

    if (!response.ok) throw new Error(`Tavily API error: ${response.status}`)

    const data = await response.json()
    const parts: string[] = []

    if (data.answer) {
      parts.push(locale === "zh" ? `摘要：${data.answer}` : `Summary: ${data.answer}`)
    }

    for (const result of (data.results ?? []).slice(0, 5)) {
      parts.push(`- [${result.title}](${result.url})\n  ${summarizeText(result.content, 200)}`)
    }

    return parts.length > 0
      ? parts.join("\n\n")
      : locale === "zh"
        ? `未找到"${query}"相关结果。`
        : `No results for "${query}".`
  },
}

export const classifyPromptTool: AgentToolDefinition = {
  name: "classify_prompt",
  description: "Output the final classification for a prompt including title, description, category, tags, and quality score.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Suggested title" },
      description: { type: "string", description: "Brief description (1-2 sentences)" },
      category: { type: "string", description: "Category slug" },
      tags: { type: "array", items: { type: "string" }, description: "Suggested tags" },
      model: { type: "string", description: "Recommended model (universal, gpt4, claude, gemini, deepseek, minimax)" },
      qualityScore: { type: "number", description: "Quality score 0-1" },
      riskLevel: { type: "string", description: "low, medium, or high" },
    },
    required: ["title", "description", "category", "tags", "qualityScore"],
  },
  execute: async (args) => {
    return JSON.stringify(args)
  },
}

export function getAnalysisTools(): AgentToolDefinition[] {
  return [searchModulesTool, webSearchTool, classifyPromptTool]
}

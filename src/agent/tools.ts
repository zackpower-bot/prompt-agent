import { prisma } from "@/lib/prisma"
import { maybeEmitTavilyQuotaAlert } from "@/lib/alerts"
import { summarizeText } from "@/lib/utils"
import { logUsage } from "@/lib/usage"
import type { AgentToolDefinition, NarrationLocale } from "./core"
import { getTemplateById, getTemplateList, type PromptTemplate } from "./templates"

function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/\b(\d{3}|[a-z_]+)\b/i)
    return match?.[1]?.toLowerCase() ?? error.message
  }
  if (typeof error === "string") return error
  return "unknown"
}

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
          {
            tags: {
              some: {
                tag: {
                  name: { contains: query },
                },
              },
            },
          },
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

    let usageLogged = false
    try {
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

      if (!response.ok) {
        usageLogged = true
        await logUsage({
          service: "tavily",
          provider: "tavily",
          requestCount: 1,
          success: false,
          errorCode: response.status.toString(),
        })
        throw new Error(`Tavily API error: ${response.status}`)
      }

      const data = await response.json()
      await logUsage({
        service: "tavily",
        provider: "tavily",
        requestCount: 1,
      })
      usageLogged = true
      await maybeEmitTavilyQuotaAlert().catch(() => {})

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
    } catch (error) {
      if (!usageLogged) {
        await logUsage({
          service: "tavily",
          provider: "tavily",
          requestCount: 1,
          success: false,
          errorCode: getErrorCode(error),
        })
      }
      throw error
    }
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

export const selectTemplateTool: AgentToolDefinition = {
  name: "select_template",
  description: `Select the best scenario template for generating a prompt. Available templates: ${getTemplateList().map((t) => `${t.id}(${t.name})`).join(", ")}. Call this FIRST before generating any prompt.`,
  parameters: {
    type: "object",
    properties: {
      template_id: {
        type: "string",
        description: `Template ID. One of: ${getTemplateList().map((t) => t.id).join(", ")}`,
      },
      reason: {
        type: "string",
        description: "Brief reason for choosing this template",
      },
    },
    required: ["template_id"],
  },
  execute: async (args, locale) => {
    const id = args.template_id as string
    const template = getTemplateById(id)

    if (!template) {
      const list = getTemplateList()
        .map((t) => `- ${t.id}: ${t.name} — ${t.description}`)
        .join("\n")
      return locale === "zh"
        ? `未找到模板 "${id}"。可用模板：\n${list}`
        : `Template "${id}" not found. Available:\n${list}`
    }

    return formatTemplateForAgent(template, locale)
  },
}

function formatTemplateForAgent(t: PromptTemplate, locale: NarrationLocale): string {
  const label = locale === "zh" ? t.name : t.nameEn
  return `## 模板: ${label}

### 骨架结构
${t.skeleton}

### 填写指南
${t.guidance}

### 质量要求
${t.qualityNotes}

### 建议变量
${t.defaultVariables.map((v) => `{{${v}}}`).join(", ")}

### 建议标签
${t.suggestedTags.join(", ")}

### 建议分类
${t.suggestedCategory}

请基于以上模板骨架和填写指南，为用户生成一个完整的、高质量的定制化提示词。`
}

export function getGenerationTools(): AgentToolDefinition[] {
  return [selectTemplateTool, searchModulesTool, webSearchTool, classifyPromptTool]
}

export function getAnalysisTools(): AgentToolDefinition[] {
  return [searchModulesTool, webSearchTool, classifyPromptTool]
}

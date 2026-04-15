export const TEMPLATES = ["standard", "expert", "structured", "rag", "agent"] as const

export type TemplateType = (typeof TEMPLATES)[number]

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  standard: "标准任务型",
  expert: "专家分析型",
  structured: "结构化输出型",
  rag: "研究 / RAG 型",
  agent: "Agent / 工具调用型",
}

export const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  standard: "适合改写、总结、解释、翻译、生成和问答等通用内容生产任务。",
  expert: "适合商业分析、方案评估、法律审阅、代码评审等高准确性场景。",
  structured: "适合 JSON、字段抽取、分类、评分、表单输出等程序消费场景。",
  rag: "适合文档问答、资料归纳、事实核查等基于外部资料的研究任务。",
  agent: "适合多步任务、工具调用、自动化工作流和 Agent 编排场景。",
}

export function isValidTemplateType(s: string | null | undefined): s is TemplateType {
  return !!s && (TEMPLATES as readonly string[]).includes(s)
}

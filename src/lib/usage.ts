import { prisma } from "@/lib/prisma"

type UsageEntry = {
  service: "llm" | "tavily"
  provider: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  requestCount?: number
  success?: boolean
  errorCode?: string
}

export async function logUsage(entry: UsageEntry): Promise<void> {
  try {
    await prisma.usageLog.create({
      data: {
        service: entry.service,
        provider: entry.provider,
        model: entry.model ?? null,
        inputTokens: entry.inputTokens ?? null,
        outputTokens: entry.outputTokens ?? null,
        requestCount: entry.requestCount ?? 1,
        success: entry.success ?? true,
        errorCode: entry.errorCode ?? null,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("logUsage failed", error)
    }
  }
}

import { getPromptById } from "@/app/actions/prompt.actions"
import { getTestCasesByPrompt } from "@/app/actions/test-case.actions"
import { recordEntityUsage } from "@/lib/entity-usage"
import { PromptDetailClient } from "./detail-client"
import { notFound } from "next/navigation"

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [promptResult, testCasesResult] = await Promise.all([
    getPromptById(id),
    getTestCasesByPrompt(id),
  ])
  if (!promptResult.success) notFound()

  void recordEntityUsage({
    entityType: "prompt",
    entityId: id,
    action: "view",
    context: "detail_view",
  }).catch(() => {})

  return (
    <PromptDetailClient
      prompt={promptResult.data}
      initialTestCases={testCasesResult.success ? testCasesResult.data : []}
    />
  )
}

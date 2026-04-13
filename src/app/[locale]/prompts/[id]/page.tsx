import { getPromptById } from "@/app/actions/prompt.actions"
import { PromptDetailClient } from "./detail-client"
import { notFound } from "next/navigation"

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPromptById(id)
  if (!result.success) notFound()
  return <PromptDetailClient prompt={result.data} />
}

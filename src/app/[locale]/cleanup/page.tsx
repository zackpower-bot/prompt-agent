import { getPromptsForCleanup } from "@/app/actions/prompt.actions"
import { CleanupClient } from "./cleanup-client"

export default async function CleanupPage() {
  const result = await getPromptsForCleanup(50)
  const prompts = result.success ? result.data : []
  return <CleanupClient prompts={prompts} />
}

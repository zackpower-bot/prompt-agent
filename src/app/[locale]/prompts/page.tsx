import { getPromptsPaginated, getAllTags } from "@/app/actions/prompt.actions"
import { PromptsClient } from "./prompts-client"

export default async function PromptsPage() {
  const [promptsResult, tagsResult] = await Promise.all([
    getPromptsPaginated(1, 20),
    getAllTags(),
  ])

  const initialData = promptsResult.success ? promptsResult.data : { prompts: [], total: 0, page: 1, pageSize: 20 }
  const allTags = tagsResult.success ? tagsResult.data : []

  return <PromptsClient initialData={initialData} allTags={allTags} />
}

import { cache } from "react"
import { Link } from "@/i18n/navigation"
import { getPromptsPaginated, type PromptWithTags } from "@/app/actions/prompt.actions"

const fetchRecentPrompts = cache(async () => {
  const result = await getPromptsPaginated(1, 5)
  return result.success ? result.data.prompts : []
})

export async function RecentTasksCard() {
  const prompts = await fetchRecentPrompts()

  return (
    <article className="rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">最近任务</h2>
        <p className="text-sm text-muted-foreground">回看刚保存的提示词，继续复用或完善。</p>
      </div>
      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm leading-6 text-muted-foreground">
          还没有任何提示词资产。运行一次任务并保存结果后会显示在这里。
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <Link
              key={prompt.id}
              href={`/prompts/${prompt.id}`}
              className="block rounded-2xl border border-border/60 bg-background/80 px-4 py-4 transition hover:border-agent/60"
            >
              <p className="font-medium text-foreground">{prompt.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{summarizePrompt(prompt)}</p>
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}

export function RecentTasksSkeleton() {
  return (
    <article className="rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <div className="h-4 w-32 rounded bg-muted/60" />
        <div className="h-3 w-40 rounded bg-muted/40" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-dashed border-border/60 px-4 py-4">
            <div className="h-4 rounded bg-muted/50" />
            <div className="mt-2 h-3 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </article>
  )
}

function summarizePrompt(prompt: PromptWithTags) {
  const source = (prompt.description?.trim() || prompt.content?.trim() || "").replace(/\s+/g, " ")
  if (!source) return "暂无描述"
  return source.length > 84 ? `${source.slice(0, 84).trim()}...` : source
}

"use client"

import { PROMPT_TEMPLATES } from "@/lib/prompt-templates"

interface TemplateGridProps {
  onSelect: (prompt: string) => void
}

export function TemplateGrid({ onSelect }: TemplateGridProps) {
  return (
    <article className="rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">从模板开始</h2>
        <p className="text-sm text-muted-foreground">点击下方模板，快速填充你的提示词任务。</p>
      </div>
      <div className="grid gap-3">
        {PROMPT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.prompt)}
            className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-left transition hover:border-agent/60"
          >
            <p className="text-sm font-semibold leading-6 text-foreground">{template.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-3">{template.prompt}</p>
          </button>
        ))}
      </div>
    </article>
  )
}

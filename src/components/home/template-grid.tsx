"use client"

import { PROMPT_TEMPLATES } from "@/lib/prompt-templates"

interface TemplateGridProps {
  onSelect: (prompt: string) => void
}

export function TemplateGrid({ onSelect }: TemplateGridProps) {
  return (
    <article className="space-y-4">
      <div className="mb-4 space-y-1">
        <h2 className="text-xl">从模板开始</h2>
        <p className="text-sm text-muted-foreground">点击下方模板，快速填充你的提示词任务。</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PROMPT_TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onSelect(template.prompt)}
              className="w-full rounded-lg border border-border/50 p-4 text-left transition-colors hover:bg-muted/40"
            >
              <h3 className="font-serif text-base">{template.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{template.prompt}</p>
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}

"use client"

import { useEffect, useState, useTransition } from "react"
import { Link } from "@/i18n/navigation"
import { Star, Clock } from "lucide-react"
import { getSidebarPrompts } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"

interface Props {
  onNavigate?: () => void
}

export function SidebarPrompts({ onNavigate }: Props) {
  const [favorites, setFavorites] = useState<PromptWithTags[]>([])
  const [recent, setRecent] = useState<PromptWithTags[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getSidebarPrompts()
      if (result.success) {
        setFavorites(result.data.favorites)
        setRecent(result.data.recent)
      }
    })
  }, [])

  if (favorites.length === 0 && recent.length === 0 && !isPending) return null

  return (
    <div className="space-y-3 px-2">
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">收藏</span>
          </div>
          {favorites.map((p) => (
            <Link
              key={p.id}
              href={`/prompts/${p.id}`}
              onClick={onNavigate}
              className="block truncate rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={p.title}
            >
              {p.title}
            </Link>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">最近使用</span>
          </div>
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/prompts/${p.id}`}
              onClick={onNavigate}
              className="block truncate rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={p.title}
            >
              {p.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

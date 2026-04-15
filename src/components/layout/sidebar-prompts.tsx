"use client"

import { useEffect, useState, useTransition } from "react"
import { Clock, Star } from "lucide-react"

import { getSidebarPrompts } from "@/app/actions/prompt.actions"
import type { PromptWithTags } from "@/app/actions/prompt.actions"
import { Link } from "@/i18n/navigation"

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
    <div className="space-y-4 px-2">
      {favorites.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground">收藏</span>
          </div>
          <div className="space-y-1">
            {favorites.map((p) => (
              <Link
                key={p.id}
                href={`/prompts/${p.id}`}
                onClick={onNavigate}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                title={p.title}
              >
                <span className="truncate text-sm font-medium">{p.title}</span>
                <span className="truncate text-xs text-muted-foreground">已收藏提示词</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">最近使用</span>
          </div>
          <div className="space-y-1">
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/prompts/${p.id}`}
                onClick={onNavigate}
                className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                title={p.title}
              >
                <span className="truncate text-sm font-medium">{p.title}</span>
                <span className="truncate text-xs text-muted-foreground">最近使用的提示词</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

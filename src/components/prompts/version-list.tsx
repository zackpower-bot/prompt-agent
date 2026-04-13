"use client"

import { useState, useEffect, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, ChevronDown, ChevronUp } from "lucide-react"
import { getVersions, type VersionWithMeta } from "@/app/actions/version.actions"

interface Props {
  promptId: string
  currentContent: string
}

export function VersionList({ promptId, currentContent }: Props) {
  const [versions, setVersions] = useState<VersionWithMeta[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getVersions(promptId)
      if (result.success) setVersions(result.data)
    })
  }, [promptId])

  if (versions.length === 0 && !isPending) {
    return <p className="text-xs text-muted-foreground py-4 text-center">暂无版本记录</p>
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <div key={v.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="mono-label">V{v.versionNumber}</Badge>
              <span className="text-sm font-medium">{v.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(v.createdAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              >
                {expanded === v.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          {expanded === v.id && (
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">{v.content}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { Layers, Loader2 } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseJsonResponseOrThrow } from "@/lib/utils"

interface ScenarioOption {
  id: string
  name: string
  description: string
  recipeCount: number
  similarity: number
}

interface Props {
  promptContent: string
}

export function ScenarioSuggestions({ promptContent }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const analyze = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agent/suggest-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: promptContent, topK: 3 }),
      })
      const data = await parseJsonResponseOrThrow<{ scenarios?: ScenarioOption[] }>(res, "场景建议失败")
      if (Array.isArray(data.scenarios)) {
        setScenarios(data.scenarios)
      }
    } catch {
      // graceful: leave scenarios empty
    } finally {
      setAnalyzed(true)
      setLoading(false)
    }
  }, [promptContent])

  useEffect(() => {
    if (!analyzed && !loading) {
      void analyze()
    }
  }, [analyzed, loading, analyze])

  if (!analyzed && !loading) return null

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4" />
          相似场景
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? "正在搜索相似场景..." : "暂无相似场景。可以到「场景配方」新建一个。"}
          </p>
        ) : (
          <ul className="space-y-2">
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <Link
                  href={`/scenarios/${scenario.id}`}
                  className="block rounded-md p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base">{scenario.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="warm" className="text-[10px]">
                        {(scenario.similarity * 100).toFixed(0)}%
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {scenario.recipeCount} 配方
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

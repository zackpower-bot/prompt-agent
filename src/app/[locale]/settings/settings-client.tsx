"use client"

import { useState, useCallback, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Save, Check, ToggleLeft, ToggleRight } from "lucide-react"
import { upsertProfile, toggleProfile } from "@/app/actions/profile.actions"
import type { ProfileEntry } from "@/app/actions/profile.actions"
import type { ProfileKey } from "@/types/memory"

const PROFILE_CONFIGS: { key: ProfileKey; label: string; description: string; placeholder: string }[] = [
  {
    key: "persona",
    label: "Agent 身份",
    description: "定义 Agent 的角色、专长和行为方式。始终生效，不参与语义检索。",
    placeholder: "你是一个资深提示词工程师，专注于中文自然语言提示词。\n你的风格是简洁直接，每个提示词都必须包含角色定义和约束条件。",
  },
  {
    key: "style_rules",
    label: "风格规则",
    description: "Agent 输出的固定风格约束。",
    placeholder: "始终使用 Markdown 格式\n变量使用 {{variable_name}} 语法\n约束条件用编号列表",
  },
  {
    key: "default_language",
    label: "默认语言",
    description: "Agent 生成提示词时的默认语言。",
    placeholder: "简体中文",
  },
]

export function SettingsClient({ initialProfiles }: { initialProfiles: ProfileEntry[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of initialProfiles) map[p.key] = p.content
    return map
  })
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const handleSave = useCallback((key: ProfileKey) => {
    const content = drafts[key]
    if (!content?.trim()) return
    startTransition(async () => {
      const result = await upsertProfile(key, content.trim())
      if (result.success) {
        setProfiles((prev) => {
          const idx = prev.findIndex((p) => p.key === key)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = result.data
            return next
          }
          return [...prev, result.data]
        })
        setSaved((prev) => ({ ...prev, [key]: true }))
        setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
      }
    })
  }, [drafts])

  const handleToggle = useCallback((key: ProfileKey, current: boolean) => {
    startTransition(async () => {
      const result = await toggleProfile(key, !current)
      if (result.success) {
        setProfiles((prev) => prev.map((p) => p.key === key ? { ...p, isActive: !current } : p))
      }
    })
  }, [])

  return (
    <div className="container-reading">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl">
          <Bot className="h-6 w-6" />
          Agent 设置
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配置 Agent 的身份、风格和默认行为。这些设定始终生效于每次生成。
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="sticky top-20 hidden w-48 shrink-0 self-start lg:block">
          <nav className="flex flex-col gap-1 text-sm">
            {PROFILE_CONFIGS.map((config) => (
              <a key={config.key} href={`#${config.key}`} className="rounded-md px-3 py-1.5 hover:bg-muted/50">
                {config.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          {PROFILE_CONFIGS.map((config) => {
          const existing = profiles.find((p) => p.key === config.key)
          const isActive = existing?.isActive ?? false
          const draft = drafts[config.key] ?? ""
          const isSaved = saved[config.key] ?? false

          return (
            <section key={config.key} id={config.key} className="space-y-4 scroll-mt-20">
              <div>
                <h2 className="mb-2 text-xl">{config.label}</h2>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{config.label}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {existing && (
                        <button
                          onClick={() => handleToggle(config.key, isActive)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          title={isActive ? "已启用" : "已禁用"}
                          disabled={isPending}
                        >
                          {isActive ? (
                            <ToggleRight className="h-5 w-5 text-agent" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      {existing && (
                        <Badge variant="outline">
                          {isActive ? "启用" : "禁用"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [config.key]: e.target.value }))}
                    placeholder={config.placeholder}
                    className="min-h-[100px] sm:min-h-[120px] font-mono text-sm"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleSave(config.key)}
                      disabled={isPending || !draft.trim()}
                    >
                      {isSaved ? (
                        <><Check className="mr-1 h-3 w-3" />已保存</>
                      ) : (
                        <><Save className="mr-1 h-3 w-3" />保存</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )
        })}
        </div>
      </div>
    </div>
  )
}

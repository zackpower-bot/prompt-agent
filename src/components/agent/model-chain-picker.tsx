"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Check, ChevronDown, X } from "lucide-react"

import { getAvailableProviderNames } from "@/app/actions/providers.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AVAILABLE_MODELS,
  TIER_LABEL,
  type AvailableModel,
} from "@/lib/available-models"
import { cn } from "@/lib/utils"
import { useModelChain } from "@/hooks/use-model-chain"

const PROVIDER_LABEL: Record<string, string> = {
  minimax: "MiniMax",
  openai: "OpenAI",
  zhipu: "智谱",
  gemini: "Gemini",
  kimi: "Kimi",
  deepseek: "DeepSeek",
}

export function ModelChainPicker() {
  const { chain, setChain, reset } = useModelChain()
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    void getAvailableProviderNames().then((providers) => {
      setAvailableProviders(new Set(providers))
    })
  }, [])

  const grouped = useMemo(() => {
    return AVAILABLE_MODELS.reduce<Record<string, AvailableModel[]>>((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = []
      acc[model.provider].push(model)
      return acc
    }, {})
  }, [])

  const isEntryInChain = (entry: AvailableModel) =>
    chain.some((item) => item.provider === entry.provider && item.model === entry.model)

  const toggleEntry = (entry: AvailableModel) => {
    if (isEntryInChain(entry)) {
      setChain(
        chain.filter((item) => !(item.provider === entry.provider && item.model === entry.model))
      )
      return
    }
    setChain([...chain, { provider: entry.provider, model: entry.model }])
  }

  const moveEntry = (index: number, delta: -1 | 1) => {
    const next = [...chain]
    const swapIndex = index + delta
    if (swapIndex < 0 || swapIndex >= next.length) return
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    setChain(next)
  }

  const removeEntry = (index: number) => {
    setChain(chain.filter((_, currentIndex) => currentIndex !== index))
  }

  const primary = chain[0]
  const primaryMeta = primary
    ? AVAILABLE_MODELS.find((item) => item.provider === primary.provider && item.model === primary.model)
    : undefined
  const primaryLabel = primaryMeta
    ? primaryMeta.label
    : primary
      ? `${primary.provider}/${primary.model}`
      : "未选"
  const fallbackCount = Math.max(0, chain.length - 1)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
          <span className="font-medium">{primaryLabel}</span>
          {fallbackCount > 0 ? (
            <span className="text-muted-foreground">+{fallbackCount} 备用</span>
          ) : null}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-4">
        <div className="mb-4">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="font-serif text-sm">模型链</h3>
            <span className="text-[11px] text-muted-foreground">
              {chain.length} / {AVAILABLE_MODELS.length}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            按顺序尝试，失败自动切到下一个。
          </p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground/70">当前链</p>
          {chain.length === 0 ? (
            <p className="text-xs text-muted-foreground">空。请从下方添加。</p>
          ) : (
            <ul className="space-y-1.5">
              {chain.map((entry, index) => {
                const meta = AVAILABLE_MODELS.find(
                  (item) => item.provider === entry.provider && item.model === entry.model
                )
                const missing = !availableProviders.has(entry.provider)
                return (
                  <li
                    key={`${entry.provider}-${entry.model}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                      missing
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border/60 bg-muted/30"
                    )}
                  >
                    <span className="w-4 text-[10px] tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {meta ? meta.label : `${entry.provider}/${entry.model}`}
                    </span>
                    {missing ? (
                      <Badge variant="outline" className="text-[9px]">
                        key 未配
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0}
                      onClick={() => moveEntry(index, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === chain.length - 1}
                      onClick={() => moveEntry(index, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => removeEntry(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {Object.entries(grouped).map(([provider, models]) => {
            const hasProvider = availableProviders.has(provider)
            return (
              <div key={provider} className={cn("mt-4 first:mt-0", !hasProvider && "opacity-50")}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium">{PROVIDER_LABEL[provider] ?? provider}</p>
                  {!hasProvider ? (
                    <Badge variant="outline" className="text-[9px]">
                      key 未配置
                    </Badge>
                  ) : null}
                </div>
                <ul className="space-y-0.5">
                  {models.map((model) => {
                    const checked = isEntryInChain(model)
                    return (
                      <li key={`${model.provider}-${model.model}`}>
                        <button
                          type="button"
                          onClick={() => hasProvider && toggleEntry(model)}
                          disabled={!hasProvider}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
                            hasProvider ? "hover:bg-muted/60" : "cursor-not-allowed"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {checked ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{model.label}</span>
                          <Badge
                            variant={model.tier === "free" ? "warm" : "outline"}
                            className="text-[9px]"
                          >
                            {TIER_LABEL[model.tier]}
                          </Badge>
                          <span className="text-[9px] tabular-nums text-muted-foreground">
                            {Math.round(model.contextWindow / 1000)}K
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={reset}>
            恢复默认
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            完成
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

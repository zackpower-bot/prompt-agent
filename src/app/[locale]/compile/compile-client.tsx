"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  BrainCircuit,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import { createRecipe } from "@/app/actions/recipe.actions"
import { createScenario } from "@/app/actions/scenario.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useModelChain } from "@/hooks/use-model-chain"
import { useRouter } from "@/i18n/navigation"
import { SLOT_LABELS, SLOTS, isValidSlot } from "@/lib/slots"
import { parseJsonResponseOrThrow, readErrorResponse } from "@/lib/utils"

type CompileStatus = "idle" | "streaming" | "done" | "error"

interface RetrievedModule {
  id: string
  title: string
  type: string | null
  slot: string | null
  contentPreview: string
  similarity: number
}

interface RetrievalResult {
  hasEmbedding: boolean
  modules: RetrievedModule[]
  bySlot: Record<string, RetrievedModule[]>
}

function derivePromptTitle(goal: string, output: string) {
  const firstNonEmptyLine =
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""

  const cleaned = firstNonEmptyLine.replace(/^#+\s*/, "").slice(0, 60)
  if (cleaned) return cleaned
  return goal.trim().slice(0, 60) || "Compiled Prompt"
}

function deriveRecipeDescription(goal: string, output: string) {
  const firstSection =
    output
      .split(/\r?\n\r?\n/)
      .map((section) => section.trim())
      .find(Boolean) ?? ""

  return firstSection.slice(0, 160) || goal.trim().slice(0, 160)
}

export function CompileClient() {
  const t = useTranslations("compile")
  const router = useRouter()
  const { chain } = useModelChain()
  const [goal, setGoal] = useState("")
  const [output, setOutput] = useState("")
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle")
  const [compileError, setCompileError] = useState<string | null>(null)
  const [retrieval, setRetrieval] = useState<RetrievalResult | null>(null)
  const [retrieving, setRetrieving] = useState(false)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const groupedSlots = useMemo<Array<{ key: string; label: string; items: RetrievedModule[] }>>(() => {
    const bySlot = retrieval?.bySlot ?? {}
    const ordered = SLOTS
      .filter((slot) => Array.isArray(bySlot[slot]) && bySlot[slot].length > 0)
      .map((slot) => ({
        key: slot as string,
        label: SLOT_LABELS[slot],
        items: bySlot[slot],
      }))

    if (bySlot._unclassified?.length) {
      ordered.push({
        key: "_unclassified",
        label: t("unclassifiedHeading"),
        items: bySlot._unclassified,
      })
    }

    return ordered
  }, [retrieval, t])

  const canSubmit = goal.trim().length > 0 && compileStatus !== "streaming"
  const canActOnResult = compileStatus === "done" && output.trim().length > 0

  const runRetrieval = useCallback(async (nextGoal: string) => {
    setRetrieving(true)
    setRetrieval(null)
    try {
      const response = await fetch("/api/compile/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: nextGoal, topK: 10 }),
      })

      const data = await parseJsonResponseOrThrow<RetrievalResult>(response, "检索失败")
      setRetrieval(data)
    } catch {
      setRetrieval({ hasEmbedding: false, modules: [], bySlot: {} })
    } finally {
      setRetrieving(false)
    }
  }, [])

  const handleCompile = useCallback(async () => {
    const trimmedGoal = goal.trim()
    if (!trimmedGoal) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setOutput("")
    setCompileError(null)
    setCompileStatus("streaming")
    void runRetrieval(trimmedGoal)

    try {
      const response = await fetch("/api/agent/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: trimmedGoal,
          locale: "zh",
          preferredChain: chain,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(await readErrorResponse(response, `HTTP ${response.status}`))
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let eventType = ""  // persist across chunks so events split across reads aren't dropped (same fix as b4b6157)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ") && eventType) {
            const data = JSON.parse(line.slice(6))
            switch (eventType) {
              case "token":
                setOutput((prev) => prev + ((data as { token: string }).token ?? ""))
                break
              case "result": {
                const resultData = data as { text?: string; provider?: string; model?: string }
                setOutput(resultData.text ?? "")
                if (resultData.provider) setLastProvider(resultData.provider)
                if (resultData.model) setLastModel(resultData.model)
                break
              }
              case "done":
                setCompileStatus("done")
                break
              case "error":
                setCompileError((data as { message?: string }).message ?? t("errorPrefix"))
                setCompileStatus("error")
                break
            }
            eventType = ""
          }
        }
      }

      setCompileStatus((prev) => (prev === "streaming" ? "done" : prev))
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      setCompileError(`${t("errorPrefix")} ${(error as Error).message}`)
      setCompileStatus("error")
    }
  }, [chain, goal, runRetrieval, t])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        if (canSubmit) {
          void handleCompile()
        }
      }
    },
    [canSubmit, handleCompile]
  )

  const handleSavePrompt = useCallback(async () => {
    if (!canActOnResult) return
    setIsSavingPrompt(true)
    try {
      const response = await fetch("/api/agent/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: output,
          classification: {
            title: derivePromptTitle(goal, output),
            description: goal.trim().slice(0, 160),
            category: "compiled",
            model: "universal",
          },
          trajectory: [],
          userMessage: goal,
          provider: lastProvider ?? undefined,
          model: lastModel ?? undefined,
        }),
      })

      const data = await parseJsonResponseOrThrow<{ promptId: string }>(response, "保存失败")
      toast.success(t("savedToast"))
      router.push(`/prompts/${data.promptId}`)
    } catch (error) {
      toast.error(`${t("errorPrefix")} ${(error as Error).message}`)
    } finally {
      setIsSavingPrompt(false)
    }
  }, [canActOnResult, goal, lastModel, lastProvider, output, router, t])

  const handleAssembleRecipe = useCallback(async () => {
    if (!canActOnResult) return
    setIsCreatingRecipe(true)
    try {
      const scenarioResult = await createScenario({
        name: goal.trim().slice(0, 60) || "编译场景",
        description: goal.trim(),
      })

      if (!scenarioResult.success) {
        throw new Error(scenarioResult.error)
      }

      const retrievedSteps =
        retrieval?.modules.slice(0, 10).map((module) => ({ moduleId: module.id })) ?? []

      const recipeResult = await createRecipe({
        scenarioId: scenarioResult.data.id,
        name: "编译草稿配方",
        description: deriveRecipeDescription(goal, output),
        steps: retrievedSteps,
      })

      if (!recipeResult.success) {
        throw new Error(recipeResult.error)
      }

      toast.success(t("recipeCreatedToast"))
      router.push(`/scenarios/${scenarioResult.data.id}/recipes/${recipeResult.data.id}`)
    } catch (error) {
      toast.error(`${t("errorPrefix")} ${(error as Error).message}`)
    } finally {
      setIsCreatingRecipe(false)
    }
  }, [canActOnResult, goal, output, retrieval?.modules, router, t])

  const handleReset = useCallback(() => {
    setOutput("")
    setCompileError(null)
    setCompileStatus("idle")
    setRetrieval(null)
    setRetrieving(false)
  }, [])

  return (
    <TooltipProvider>
      <div className="container-editor">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="font-serif text-2xl">{t("pageTitle")}</h1>
            <p className="max-w-[64ch] text-sm leading-7 text-muted-foreground">{t("subtitle")}</p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="min-w-0 space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="space-y-4">
                  <textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={5}
                    placeholder={t("goalPlaceholder")}
                    className="min-h-[140px] max-h-[300px] w-full resize-none rounded-xl border border-input/80 bg-card px-4 py-3 text-[15px] leading-relaxed shadow-xs outline-none transition-all placeholder:text-muted-foreground/70 hover:border-input focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm"
                  />

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                    <Button onClick={() => void handleCompile()} disabled={!canSubmit}>
                      {compileStatus === "streaming" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      {compileStatus === "streaming" ? t("compiling") : t("compileButton")}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl">{t("outputHeading")}</h2>
                  {compileStatus === "streaming" ? <span className="agent-dot-pulse" /> : null}
                </div>

                <div className="min-h-[240px] rounded-2xl border border-border bg-card p-5 shadow-sm">
                  {output ? (
                    <article className="max-w-[72ch] whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                      {output}
                    </article>
                  ) : (
                    <p className="text-sm text-muted-foreground">{compileError ?? t("compiling")}</p>
                  )}
                </div>

                {canActOnResult ? (
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSavePrompt()} disabled={isSavingPrompt}>
                      {isSavingPrompt ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {t("saveAsPrompt")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleAssembleRecipe()}
                      disabled={isCreatingRecipe}
                    >
                      {isCreatingRecipe ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {t("assembleAsRecipe")}
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      {t("recompile")}
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl">{t("recommendedHeading")}</h2>
                {retrieving ? <span className="agent-dot-pulse" /> : null}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                {retrieving ? (
                  <p className="text-sm text-muted-foreground">{t("retrieving")}</p>
                ) : null}

                {!retrieving && retrieval && !retrieval.hasEmbedding ? (
                  <p className="text-sm text-muted-foreground">{t("noEmbeddingService")}</p>
                ) : null}

                {!retrieving && retrieval?.hasEmbedding && retrieval.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noMatchingModules")}</p>
                ) : null}

                {!retrieving && groupedSlots.length > 0 ? (
                  <div className="space-y-5">
                    {groupedSlots.map((group) => (
                      <div key={group.key} className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                          {group.label}
                        </p>
                        <div className="space-y-2">
                          {group.items.map((module) => (
                            <Tooltip key={module.id}>
                              <TooltipTrigger className="w-full text-left">
                                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/35">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-medium">{module.title}</p>
                                    <Badge variant="warm">
                                      {Math.round(module.similarity * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">
                                    {module.contentPreview}
                                  </p>
                                  {module.slot && isValidSlot(module.slot) ? (
                                    <div className="mt-2">
                                      <Badge variant="outline">{SLOT_LABELS[module.slot]}</Badge>
                                    </div>
                                  ) : null}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm whitespace-pre-wrap text-left leading-6">
                                {module.contentPreview.slice(0, 400)}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!retrieving && !retrieval ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BrainCircuit className="h-4 w-4" />
                    <span>{t("recommendedHeading")}</span>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

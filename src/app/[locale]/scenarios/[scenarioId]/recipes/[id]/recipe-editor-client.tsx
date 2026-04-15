"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash,
} from "lucide-react"
import { toast } from "sonner"

import {
  assembleRecipe,
  updateRecipe,
  type RecipeStepRecord,
  type RecipeWithScenario,
} from "@/app/actions/recipe.actions"
import { type ModuleWithMeta } from "@/app/actions/module.actions"
import { ModulePicker } from "@/components/recipes/module-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Link, useRouter } from "@/i18n/navigation"
import { evaluateRecipeHealth, type RecipeHealth } from "@/lib/recipe-health"
import { SLOT_LABELS, isValidSlot } from "@/lib/slots"
import {
  TEMPLATES,
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_LABELS,
  isValidTemplateType,
  type TemplateType,
} from "@/lib/templates"
import { summarizeText } from "@/lib/utils"

type StepKind = "module" | "inline"

type EditableStep = {
  localId: string
  type: StepKind
  moduleId?: string
  inline?: string
  order: number
}

const generateLocalId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `step-${Math.random().toString(36).slice(2, 11)}`
}

const toEditableSteps = (steps: RecipeStepRecord[]): EditableStep[] => {
  if (!steps?.length) return []
  return steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((step, index) => ({
      localId: generateLocalId(),
      type: step.moduleId ? "module" : "inline",
      moduleId: step.moduleId ?? undefined,
      inline: step.inline ?? "",
      order: index,
    }))
}

const withSequentialOrder = (steps: EditableStep[]): EditableStep[] =>
  steps.map((step, index) => ({ ...step, order: index }))

const qualityToGrade = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  const clamped = Math.max(0, Math.min(1, value))
  if (clamped >= 0.85) return "A"
  if (clamped >= 0.65) return "B"
  if (clamped >= 0.4) return "C"
  return "D"
}

interface RecipeEditorClientProps {
  initialRecipe: RecipeWithScenario
  modules: ModuleWithMeta[]
}

export function RecipeEditorClient({ initialRecipe, modules }: RecipeEditorClientProps) {
  const t = useTranslations("recipes")
  const router = useRouter()
  const [name, setName] = useState(initialRecipe.name)
  const [description, setDescription] = useState(initialRecipe.description ?? "")
  const [templateType, setTemplateType] = useState(initialRecipe.templateType ?? "")
  const [steps, setSteps] = useState<EditableStep[]>(() => toEditableSteps(initialRecipe.steps))
  const [assembledPreview, setAssembledPreview] = useState(initialRecipe.assembled ?? "")
  const [previewOpen, setPreviewOpen] = useState(Boolean(initialRecipe.assembled?.trim()))
  const [isSaving, startSaveTransition] = useTransition()
  const [isAssembling, startAssembleTransition] = useTransition()

  useEffect(() => {
    setName(initialRecipe.name)
    setDescription(initialRecipe.description ?? "")
    setTemplateType(initialRecipe.templateType ?? "")
    setSteps(toEditableSteps(initialRecipe.steps))
    setAssembledPreview(initialRecipe.assembled ?? "")
    setPreviewOpen(Boolean(initialRecipe.assembled?.trim()))
  }, [initialRecipe])

  const modulesById = useMemo(() => {
    const map = new Map<string, ModuleWithMeta>()
    modules.forEach((module) => map.set(module.id, module))
    return map
  }, [modules])

  const updateSteps = useCallback((updater: (prev: EditableStep[]) => EditableStep[]) => {
    setSteps((prev) => withSequentialOrder(updater(prev)))
  }, [])

  const handleMoveStep = useCallback(
    (index: number, direction: -1 | 1) => {
      updateSteps((prev) => {
        const next = [...prev]
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= next.length) return prev
        ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
        return next
      })
    },
    [updateSteps]
  )

  const handleDeleteStep = useCallback(
    (index: number) => {
      updateSteps((prev) => prev.filter((_, stepIndex) => stepIndex !== index))
    },
    [updateSteps]
  )

  const handleAddStep = useCallback(() => {
    updateSteps((prev) => [...prev, { localId: generateLocalId(), type: "inline", inline: "", order: prev.length }])
  }, [updateSteps])

  const handleStepTypeChange = useCallback(
    (index: number, type: StepKind) => {
      updateSteps((prev) => {
        const next = [...prev]
        if (!next[index] || next[index].type === type) return prev
        next[index] = {
          ...next[index],
          type,
          moduleId: type === "module" ? next[index].moduleId ?? modules[0]?.id ?? undefined : undefined,
          inline: type === "inline" ? next[index].inline ?? "" : undefined,
        }
        return next
      })
    },
    [modules, updateSteps]
  )

  const handleModuleChange = useCallback(
    (index: number, moduleId: string | null) => {
      updateSteps((prev) => {
        const next = [...prev]
        if (!next[index]) return prev
        next[index] = {
          ...next[index],
          moduleId: moduleId ?? undefined,
        }
        return next
      })
    },
    [updateSteps]
  )

  const handleInlineChange = useCallback(
    (index: number, value: string) => {
      updateSteps((prev) => {
        const next = [...prev]
        if (!next[index]) return prev
        next[index] = {
          ...next[index],
          inline: value,
        }
        return next
      })
    },
    [updateSteps]
  )

  const recipeHealth = useMemo<RecipeHealth>(
    () =>
      evaluateRecipeHealth({
        templateType,
        steps: steps.map((step) => ({
          moduleSlot:
            step.type === "module" && step.moduleId
              ? modulesById.get(step.moduleId)?.slot ?? null
              : null,
          isInline: step.type === "inline",
        })),
      }),
    [modulesById, steps, templateType]
  )

  const missingCoreSlotsLabel = useMemo(() => {
    if (recipeHealth.status === "healthy" || recipeHealth.missingCoreSlots.length === 0) return null
    return t("missingCoreSlots", {
      slots: recipeHealth.missingCoreSlots.map((slot) => SLOT_LABELS[slot]).join(" / "),
    })
  }, [recipeHealth, t])

  const healthBadge = useMemo(() => {
    switch (recipeHealth.status) {
      case "healthy":
        return <Badge variant="warm">{t("healthHealthy")}</Badge>
      case "partial":
        return <Badge variant="outline">{t("healthPartial")}</Badge>
      case "draft":
        return <Badge variant="secondary">{t("healthDraft")}</Badge>
      case "unclassified":
      default:
        return <Badge variant="outline">{t("healthUnclassified")}</Badge>
    }
  }, [recipeHealth.status, t])

  const templateDescription = isValidTemplateType(templateType)
    ? TEMPLATE_DESCRIPTIONS[templateType]
    : t("templateTypeUnclassified")

  const handleSave = useCallback(() => {
    startSaveTransition(async () => {
      const result = await updateRecipe(initialRecipe.id, {
        name: name.trim(),
        description: description.trim(),
        templateType: isValidTemplateType(templateType) ? templateType : null,
        steps: steps.map((step, index) =>
          step.type === "module"
            ? { order: index, moduleId: step.moduleId }
            : { order: index, inline: (step.inline ?? "").trim() }
        ),
      })

      if (!result.success) {
        toast.error(result.error ?? t("saveError"))
        return
      }

      setSteps(toEditableSteps(result.data.steps))
      setName(result.data.name)
      setDescription(result.data.description ?? "")
      setTemplateType(result.data.templateType ?? "")
      setAssembledPreview(result.data.assembled ?? "")
      setPreviewOpen(Boolean(result.data.assembled?.trim()))
      toast.success(t("savedToast"))
      router.refresh()
    })
  }, [description, initialRecipe.id, name, router, steps, t, templateType])

  const qualityGrade = qualityToGrade(initialRecipe.quality)
  const hasSteps = steps.length > 0
  const assembledAvailable = Boolean(assembledPreview?.trim())

  const handleAssemble = useCallback(() => {
    if (previewOpen && assembledAvailable) {
      setPreviewOpen(false)
      return
    }
    startAssembleTransition(async () => {
      const result = await assembleRecipe(initialRecipe.id)
      if (!result.success) {
        toast.error(result.error ?? t("assembleError"))
        return
      }
      setAssembledPreview(result.data.assembled)
      setPreviewOpen(true)
    })
  }, [assembledAvailable, initialRecipe.id, previewOpen, t])

  return (
    <div className="container-editor">
      <div className="space-y-6 pb-32">
        <div className="space-y-3">
          <Link
            href={`/scenarios/${initialRecipe.scenario.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToScenario", { name: initialRecipe.scenario.name })}
          </Link>

          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/scenarios" className="transition hover:text-foreground">
                {t("breadcrumb.scenario")}
              </Link>
              <span>/</span>
              <Link
                href={`/scenarios/${initialRecipe.scenario.id}`}
                className="transition hover:text-foreground"
              >
                {initialRecipe.scenario.name}
              </Link>
              <span>/</span>
              <span className="text-foreground">{t("breadcrumb.recipe")}</span>
              <span>/</span>
              <span className="font-medium text-foreground">{initialRecipe.name}</span>
            </div>
          </nav>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-4">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="为这个配方起个名字..."
                    className="h-12 text-2xl font-semibold"
                    disabled={isSaving}
                  />
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    className="min-h-[120px]"
                    disabled={isSaving}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="recipe-template-type">
                      {t("templateTypeLabel")}
                    </label>
                    <select
                      id="recipe-template-type"
                      value={templateType}
                      onChange={(event) => setTemplateType(event.target.value)}
                      disabled={isSaving}
                      className="h-10 w-full rounded-md border border-input/80 bg-card px-3 py-1 text-sm shadow-xs transition-all outline-none hover:border-input focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm"
                    >
                      <option value="">{t("templateTypePlaceholder")}</option>
                      {TEMPLATES.map((template) => (
                        <option key={template} value={template}>
                          {TEMPLATE_LABELS[template]}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm leading-relaxed text-muted-foreground">{templateDescription}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {qualityGrade ? (
                    <Badge variant="outline">{t("qualityLabel", { grade: qualityGrade })}</Badge>
                  ) : null}
                  {isValidTemplateType(templateType) ? (
                    <Badge variant="secondary">{TEMPLATE_LABELS[templateType]}</Badge>
                  ) : null}
                  {healthBadge}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("stepsHeading")}</h2>
              </div>

              {missingCoreSlotsLabel ? (
                <p className="text-sm text-muted-foreground">{missingCoreSlotsLabel}</p>
              ) : null}

              {hasSteps ? (
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const moduleInfo = step.moduleId ? modulesById.get(step.moduleId) : undefined
                    const slotLabel =
                      moduleInfo?.slot && isValidSlot(moduleInfo.slot)
                        ? SLOT_LABELS[moduleInfo.slot]
                        : null

                    return (
                      <Card key={step.localId} className="border border-border/70 shadow-sm">
                        <CardHeader className="flex flex-wrap items-center gap-3 pb-3 sm:flex-nowrap">
                          <CardTitle className="text-base font-medium">
                            {t("stepNumber", { n: index + 1 })}
                          </CardTitle>
                          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                            <div
                              data-slot="button-group"
                              className="inline-flex rounded-lg border border-input bg-muted/40 p-0.5"
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant={step.type === "module" ? "secondary" : "ghost"}
                                aria-pressed={step.type === "module"}
                                onClick={() => handleStepTypeChange(index, "module")}
                                disabled={isSaving}
                              >
                                {t("stepType.module")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={step.type === "inline" ? "secondary" : "ghost"}
                                aria-pressed={step.type === "inline"}
                                onClick={() => handleStepTypeChange(index, "inline")}
                                disabled={isSaving}
                              >
                                {t("stepType.inline")}
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t("moveUp")}
                                onClick={() => handleMoveStep(index, -1)}
                                disabled={index === 0 || isSaving}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t("moveDown")}
                                onClick={() => handleMoveStep(index, 1)}
                                disabled={index === steps.length - 1 || isSaving}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t("deleteStep")}
                                onClick={() => handleDeleteStep(index)}
                                disabled={isSaving}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {step.type === "module" ? (
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-muted-foreground">
                                {t("moduleFieldLabel")}
                              </label>
                              <ModulePicker
                                value={step.moduleId ?? null}
                                options={modules.map((module) => ({
                                  id: module.id,
                                  title: module.title,
                                  type: module.type,
                                  slot: module.slot,
                                }))}
                                onChange={(moduleId) => handleModuleChange(index, moduleId)}
                                placeholder={t("moduleSelectPlaceholder")}
                              />
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {moduleInfo ? (
                                    <>
                                      <span className="text-sm font-medium">{moduleInfo.title}</span>
                                      <Badge variant="outline">{moduleInfo.type}</Badge>
                                      {slotLabel ? <Badge variant="warm">{slotLabel}</Badge> : null}
                                    </>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {t("modulePreviewPlaceholder")}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {moduleInfo
                                    ? summarizeText(moduleInfo.content, 240)
                                    : t("modulePreviewPlaceholder")}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-muted-foreground">
                                {t("inlineFieldLabel")}
                              </label>
                              <Textarea
                                value={step.inline ?? ""}
                                onChange={(event) => handleInlineChange(index, event.target.value)}
                                placeholder={t("inlinePlaceholder")}
                                className="min-h-[100px]"
                                disabled={isSaving}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="border border-dashed border-border bg-muted/20">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    <p>{t("emptyStepsTitle")}</p>
                    <p className="mt-1 text-xs">{t("emptyStepsDescription")}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={handleAddStep} disabled={isSaving}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addStep")}
                </Button>
              </div>
            </section>

            {assembledAvailable ? (
              <section className="rounded-2xl border border-border bg-card/60 p-5 text-sm shadow-sm lg:hidden">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-base font-semibold">{t("assembledPreview")}</span>
                  {previewOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {previewOpen ? (
                  <div className="mt-3 max-w-[72ch] whitespace-pre-wrap rounded-lg bg-muted/40 p-4 font-sans text-[15px] leading-[1.7] text-foreground">
                    {assembledPreview}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          {assembledAvailable ? (
            <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
              <section className="rounded-2xl border border-border bg-card/60 p-5 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold">{t("assembledPreview")}</span>
                  <Badge variant="secondary">{t("assembledPreview")}</Badge>
                </div>
                <div className="mt-3 max-w-[72ch] whitespace-pre-wrap rounded-lg bg-muted/40 p-4 font-sans text-[15px] leading-[1.7] text-foreground">
                  {assembledPreview}
                </div>
              </section>
            </aside>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("stickyHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleAssemble} disabled={isAssembling}>
              {isAssembling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {previewOpen && assembledAvailable ? t("hidePreview") : t("assemble")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

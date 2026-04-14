"use client"

import { useCallback, useMemo, useState, useTransition, type KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { createRecipe } from "@/app/actions/recipe.actions"
import {
  deleteScenario,
  updateScenario,
  type ScenarioWithRecipes,
} from "@/app/actions/scenario.actions"
import { Link, useRouter } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type EditableField = "name" | "description"

interface ScenarioDetailClientProps {
  scenario: ScenarioWithRecipes
  locale: string
}

export function ScenarioDetailClient({ scenario, locale }: ScenarioDetailClientProps) {
  const tScenarios = useTranslations("scenarios")
  const tRecipes = useTranslations("recipes")
  const router = useRouter()
  const [scenarioState, setScenarioState] = useState(() => scenario)
  const [drafts, setDrafts] = useState<Record<EditableField, string>>({
    name: scenario.name ?? "",
    description: scenario.description ?? "",
  })
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    name: false,
    description: false,
  })
  const [activeField, setActiveField] = useState<EditableField | null>(null)
  const [isUpdating, startUpdateTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [isRecipePending, startRecipeTransition] = useTransition()

  const formatDateTime = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso)
      ),
    [locale]
  )

  const recipesHeading = useMemo(
    () => tRecipes("listTitle", { count: scenarioState.recipes.length }),
    [scenarioState.recipes.length, tRecipes]
  )

  const getFieldValue = useCallback(
    (field: EditableField) =>
      field === "name" ? scenarioState.name ?? "" : scenarioState.description ?? "",
    [scenarioState.description, scenarioState.name]
  )

  const startEditingField = useCallback(
    (field: EditableField) => {
      setDrafts((prev) => ({
        ...prev,
        [field]: getFieldValue(field),
      }))
      setEditing((prev) => ({ ...prev, [field]: true }))
      setActiveField(null)
    },
    [getFieldValue]
  )

  const cancelEditingField = useCallback((field: EditableField) => {
    setDrafts((prev) => ({
      ...prev,
      [field]: getFieldValue(field),
    }))
    setEditing((prev) => ({ ...prev, [field]: false }))
    setActiveField(null)
  }, [getFieldValue])

  const handleSaveField = useCallback(
    (field: EditableField) => {
      const trimmed = drafts[field].trim()
      const current = getFieldValue(field).trim()
      if (trimmed === current) {
        setEditing((prev) => ({ ...prev, [field]: false }))
        return
      }
      setActiveField(field)
      startUpdateTransition(async () => {
        const payload = field === "name" ? { name: trimmed } : { description: trimmed }
        const result = await updateScenario(scenarioState.id, payload)
        if (!result.success) {
          toast.error(result.error ?? tScenarios("updateError"))
          cancelEditingField(field)
          return
        }
        setScenarioState((prev) => ({
          ...prev,
          name: result.data.name,
          description: result.data.description,
          updatedAt: result.data.updatedAt,
        }))
        setDrafts((prev) => ({
          ...prev,
          name: result.data.name,
          description: result.data.description ?? "",
        }))
        setEditing((prev) => ({ ...prev, [field]: false }))
        toast.success(tScenarios("updateSuccess"))
        setActiveField(null)
        router.refresh()
      })
    },
    [cancelEditingField, drafts, getFieldValue, router, scenarioState.id, startUpdateTransition, tScenarios]
  )

  const handleDeleteScenario = useCallback(() => {
    if (!window.confirm(tScenarios("confirmDelete"))) {
      return
    }
    startDeleteTransition(async () => {
      const result = await deleteScenario(scenarioState.id)
      if (!result.success) {
        toast.error(result.error ?? tScenarios("deleteError"))
        return
      }
      toast.success(tScenarios("deleteSuccess"))
      router.push("/scenarios")
    })
  }, [router, scenarioState.id, startDeleteTransition, tScenarios])

  const handleCreateRecipe = useCallback(() => {
    startRecipeTransition(async () => {
      const result = await createRecipe({
        scenarioId: scenarioState.id,
        name: "Untitled recipe",
        description: "",
        steps: [],
      })
      if (!result.success) {
        toast.error(result.error ?? tRecipes("createError"))
        return
      }
      router.push(`/scenarios/${scenarioState.id}/recipes/${result.data.id}`)
    })
  }, [router, scenarioState.id, startRecipeTransition, tRecipes])

  const getQualityGrade = useCallback((quality: number | null) => {
    if (quality === null || quality === undefined || Number.isNaN(quality)) {
      return "unscored"
    }
    const clamped = Math.max(0, Math.min(1, quality))
    if (clamped >= 0.85) return "A"
    if (clamped >= 0.65) return "B"
    if (clamped >= 0.4) return "C"
    return "D"
  }, [])

  const renderDescription = useCallback(
    (value: string | null | undefined) =>
      value?.trim() ? value : tRecipes("inlinePlaceholder"),
    [tRecipes]
  )

  const qualityBadgeClass = useCallback((grade: string) => {
    if (grade === "A") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
    if (grade === "B") return "border-border bg-muted text-foreground"
    if (grade === "C") return "border-amber-500/30 bg-amber-500/10 text-amber-700"
    if (grade === "D") return "border-red-500/30 bg-red-500/10 text-red-700"
    return "border-border bg-muted text-muted-foreground"
  }, [])

  const handleNameKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSaveField("name")
    }
    if (event.key === "Escape") {
      event.preventDefault()
      cancelEditingField("name")
    }
  }, [cancelEditingField, handleSaveField])

  const handleDescriptionKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault()
      handleSaveField("description")
    }
    if (event.key === "Escape") {
      event.preventDefault()
      cancelEditingField("description")
    }
  }, [cancelEditingField, handleSaveField])

  return (
    <div className="container-reading">
      <div className="flex flex-col gap-6">
        <Link
          href="/scenarios"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tScenarios("backToList")}
        </Link>

        <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <header className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              {editing.name ? (
                <div className="w-full">
                  <Input
                    value={drafts.name}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, name: event.target.value }))
                    }
                    onBlur={() => handleSaveField("name")}
                    onKeyDown={handleNameKeyDown}
                    aria-label={tScenarios("name")}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startEditingField("name")}
                    className="text-left"
                    aria-label={tScenarios("editName")}
                  >
                    <h1 className="text-3xl font-semibold tracking-tight">{scenarioState.name}</h1>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditingField("name")}
                    aria-label={tScenarios("editName")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              {editing.description ? (
                <div className="w-full">
                  <Textarea
                    value={drafts.description}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, description: event.target.value }))
                    }
                    onBlur={() => handleSaveField("description")}
                    onKeyDown={handleDescriptionKeyDown}
                    rows={4}
                    aria-label={tScenarios("description")}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startEditingField("description")}
                    className="text-left"
                    aria-label={tScenarios("editDescription")}
                  >
                    <p className="text-base text-muted-foreground">
                      {scenarioState.description || tScenarios("descriptionPlaceholder")}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditingField("description")}
                    aria-label={tScenarios("editDescription")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </header>

          <div
            className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
            role="status"
            aria-live="polite"
          >
            <span>{tScenarios("recipeCount", { count: scenarioState.recipes.length })}</span>
            <span>{tScenarios("lastUpdated", { value: formatDateTime(scenarioState.updatedAt) })}</span>
          </div>

          <div className="flex items-center justify-end">
            <Button
              variant="destructive"
              onClick={handleDeleteScenario}
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {tScenarios("deleteScenario")}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{recipesHeading}</h2>
            <Button onClick={handleCreateRecipe} disabled={isRecipePending}>
              {isRecipePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {tRecipes("newRecipe")}
            </Button>
          </div>

          {scenarioState.recipes.length > 0 ? (
            <div className="space-y-3">
              {scenarioState.recipes.map((recipe) => {
                const grade = getQualityGrade(recipe.quality)
                return (
                  <Card key={recipe.id} className="border border-border/70">
                    <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-base">{recipe.name}</CardTitle>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {renderDescription(recipe.description)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={qualityBadgeClass(grade)}>
                          {grade === "unscored" ? tRecipes("qualityUnknown") : tRecipes(`qualityGrades.${grade}`)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/scenarios/${scenarioState.id}/recipes/${recipe.id}`)}
                        >
                          {tRecipes("viewEdit")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {tRecipes("updatedAt", { value: formatDateTime(recipe.updatedAt) })}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {tRecipes("emptyRecipes")}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

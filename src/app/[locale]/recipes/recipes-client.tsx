"use client"

import { useCallback, useEffect, useMemo, useState, useTransition, type ChangeEvent } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { getAllRecipes, type RecipeListRecord } from "@/app/actions/recipe.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { TEMPLATE_LABELS, TEMPLATES, isValidTemplateType } from "@/lib/templates"

interface RecipesClientProps {
  initialRecipes: RecipeListRecord[]
  initialTotal: number
  pageSize: number
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export function RecipesClient({ initialRecipes, initialTotal, pageSize }: RecipesClientProps) {
  const tRecipes = useTranslations("recipes")
  const tCommon = useTranslations("common")

  const [recipes, setRecipes] = useState(initialRecipes)
  const [total, setTotal] = useState(initialTotal)
  const [templateFilter, setTemplateFilter] = useState("")
  const [hasMore, setHasMore] = useState(initialRecipes.length === pageSize)
  const [allLoaded, setAllLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRecipes(initialRecipes)
    setTotal(initialTotal)
    setHasMore(initialRecipes.length === pageSize)
    setAllLoaded(false)
  }, [initialRecipes, initialTotal, pageSize])

  const loadRecipes = useCallback(
    (offset = 0, mode: "replace" | "append" = "replace", nextTemplateType = templateFilter) => {
      startTransition(async () => {
        const result = await getAllRecipes({
          templateType: nextTemplateType || undefined,
          limit: pageSize,
          offset,
        })

        if (!result.success) return

        setRecipes((prev) => (mode === "append" ? [...prev, ...result.data] : result.data))
        setTotal(result.total)
        setHasMore(result.data.length === pageSize)
        setAllLoaded(offset > 0 && result.data.length < pageSize)
        if (mode === "replace") setAllLoaded(false)
      })
    },
    [pageSize, templateFilter]
  )

  const handleTemplateChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextValue = event.target.value
      setTemplateFilter(nextValue)
      loadRecipes(0, "replace", nextValue)
    },
    [loadRecipes]
  )

  const handleLoadMore = useCallback(() => {
    loadRecipes(recipes.length, "append")
  }, [loadRecipes, recipes.length])

  const healthBadge = useCallback(
    (status: RecipeListRecord["health"]["status"]) => {
      switch (status) {
        case "healthy":
          return <Badge variant="warm">{tRecipes("healthHealthy")}</Badge>
        case "partial":
          return <Badge variant="outline">{tRecipes("healthPartial")}</Badge>
        case "draft":
          return <Badge variant="secondary">{tRecipes("healthDraft")}</Badge>
        case "unclassified":
        default:
          return <Badge variant="outline">{tRecipes("healthUnclassified")}</Badge>
      }
    },
    [tRecipes]
  )

  const empty = useMemo(() => !isPending && recipes.length === 0, [isPending, recipes.length])

  return (
    <div className="container-reading">
      <div className="flex flex-col gap-6">
        <header className="sticky top-0 z-10 bg-background/80 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-serif text-2xl">{tRecipes("allTitle")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{total} 个配方</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground" htmlFor="recipe-template-filter">
                {tRecipes("filterByTemplate")}
              </label>
              <select
                id="recipe-template-filter"
                value={templateFilter}
                onChange={handleTemplateChange}
                className="h-10 rounded-md border border-input/80 bg-card px-3 py-1 text-sm shadow-xs transition-all outline-none hover:border-input focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm"
              >
                <option value="">{tRecipes("allTemplates")}</option>
                {TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {TEMPLATE_LABELS[template]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {recipes.length > 0 ? (
          <>
            <ul className="space-y-2">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link
                    href={`/scenarios/${recipe.scenarioId}/recipes/${recipe.id}`}
                    className="list-row rounded-xl border border-transparent bg-card/40 px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base">{recipe.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tRecipes("fromScenario", { scenario: recipe.scenarioName })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {recipe.templateType && isValidTemplateType(recipe.templateType) ? (
                        <Badge variant="secondary">{TEMPLATE_LABELS[recipe.templateType]}</Badge>
                      ) : (
                        <Badge variant="outline">{tRecipes("templateTypeUnclassified")}</Badge>
                      )}
                      {healthBadge(recipe.health.status)}
                      <Badge variant="outline">{tRecipes("stepCount", { count: recipe.stepCount })}</Badge>
                      <time className="text-xs text-muted-foreground">{formatDate(recipe.updatedAt)}</time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {hasMore ? (
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tCommon("loading")}
                    </>
                  ) : (
                    tCommon("loadMore")
                  )}
                </Button>
              </div>
            ) : null}

            {allLoaded && recipes.length > 0 ? (
              <p className="pt-3 text-center text-sm text-muted-foreground">{tCommon("allLoaded")}</p>
            ) : null}
          </>
        ) : null}

        {empty ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
            <h2 className="text-xl">{tRecipes("allTitle")}</h2>
            <p className="mx-auto mt-3 max-w-[38rem] text-sm leading-7 text-muted-foreground">
              {tRecipes("empty")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

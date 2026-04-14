import { notFound } from "next/navigation"

import { getRecipeById } from "@/app/actions/recipe.actions"
import { getModules } from "@/app/actions/module.actions"

import { RecipeEditorClient } from "./recipe-editor-client"

export default async function RecipeEditorPage({
  params,
}: {
  params: Promise<{ scenarioId: string; id: string }>
}) {
  const { scenarioId, id } = await params
  const [recipeResult, modulesResult] = await Promise.all([getRecipeById(id), getModules()])

  if (!recipeResult.success || !modulesResult.success) {
    notFound()
  }

  if (recipeResult.data.scenario.id !== scenarioId) {
    notFound()
  }

  return <RecipeEditorClient initialRecipe={recipeResult.data} modules={modulesResult.data} />
}

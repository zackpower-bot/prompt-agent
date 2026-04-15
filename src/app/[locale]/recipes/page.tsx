import { getAllRecipes } from "@/app/actions/recipe.actions"

import { RecipesClient } from "./recipes-client"

export default async function RecipesPage() {
  const result = await getAllRecipes({ limit: 50, offset: 0 })

  return (
    <RecipesClient
      initialRecipes={result.success ? result.data : []}
      initialTotal={result.success ? result.total : 0}
      pageSize={50}
    />
  )
}

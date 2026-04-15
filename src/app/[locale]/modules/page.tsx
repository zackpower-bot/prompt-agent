import { getModulesPaginated } from "@/app/actions/module.actions"
import { ModulesClient } from "./modules-client"

export default async function ModulesPage() {
  const result = await getModulesPaginated({ limit: 50, offset: 0 })
  return (
    <ModulesClient
      initialModules={result.success ? result.data : []}
      initialTotal={result.success ? result.total : 0}
      pageSize={result.success ? result.limit : 50}
    />
  )
}

import { getModules } from "@/app/actions/module.actions"
import { ModulesClient } from "./modules-client"

export default async function ModulesPage() {
  const result = await getModules()
  const modules = result.success ? result.data : []
  return <ModulesClient initialModules={modules} />
}

import { getScenariosPaginated } from "@/app/actions/scenario.actions"
import { ScenariosClient } from "./scenarios-client"

export default async function ScenariosPage() {
  const result = await getScenariosPaginated({ limit: 50, offset: 0 })
  return (
    <ScenariosClient
      initialScenarios={result.success ? result.data : []}
      initialTotal={result.success ? result.total : 0}
      pageSize={result.success ? result.limit : 50}
    />
  )
}

import { getScenarios } from "@/app/actions/scenario.actions"
import { ScenariosClient } from "./scenarios-client"

export default async function ScenariosPage() {
  const result = await getScenarios()
  const scenarios = result.success ? result.data : []
  return <ScenariosClient initialScenarios={scenarios} />
}

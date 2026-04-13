import { getUsageStats } from "@/app/actions/stats.actions"
import { StatsClient } from "./stats-client"

export default async function StatsPage() {
  const result = await getUsageStats()
  const stats = result.success ? result.data : null
  return <StatsClient stats={stats} />
}

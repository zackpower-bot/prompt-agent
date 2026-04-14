import { listActions } from "@/lib/action-log"
import { ActivityClient } from "./activity-client"

export const dynamic = "force-dynamic"

export default async function ActivityPage() {
  try {
    const actions = await listActions({ limit: 50 })
    return <ActivityClient initialActions={actions} />
  } catch (error) {
    console.error("[activity] failed to load actions", error)
    return <ActivityClient initialActions={[]} />
  }
}

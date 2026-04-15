import { listActions } from "@/lib/action-log"
import { ActivityClient } from "./activity-client"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

export default async function ActivityPage() {
  try {
    const actions = await listActions({ limit: PAGE_SIZE, offset: 0 })
    return <ActivityClient initialActions={actions} pageSize={PAGE_SIZE} />
  } catch (error) {
    console.error("[activity] failed to load actions", error)
    return <ActivityClient initialActions={[]} pageSize={PAGE_SIZE} />
  }
}

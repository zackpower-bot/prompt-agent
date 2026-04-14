"use server"

import { listActions, reverseAction, type ActionLogRow } from "@/lib/action-log"

export async function fetchActivityLogs(params?: {
  limit?: number
  offset?: number
  reversibleOnly?: boolean
}): Promise<{ success: true; data: ActionLogRow[] } | { success: false; error: string }> {
  try {
    const rows = await listActions({
      limit: params?.limit,
      offset: params?.offset,
      reversibleOnly: params?.reversibleOnly,
    })
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function reverseActionById(
  logId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await reverseAction(logId, "user")
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

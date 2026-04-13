"use server"

import { prisma } from "@/lib/prisma"
import type { ProfileKey } from "@/types/memory"

export interface ProfileEntry {
  id: string
  key: string
  content: string
  isActive: boolean
  updatedAt: string
}

function serialize(row: any): ProfileEntry {
  return {
    id: row.id,
    key: row.key,
    content: row.content,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getProfiles(): Promise<{ success: true; data: ProfileEntry[] } | { success: false; error: string }> {
  try {
    const rows = await prisma.agentProfile.findMany({ orderBy: { key: "asc" } })
    return { success: true, data: rows.map(serialize) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function upsertProfile(
  key: ProfileKey,
  content: string
): Promise<{ success: true; data: ProfileEntry } | { success: false; error: string }> {
  try {
    const row = await prisma.agentProfile.upsert({
      where: { key },
      update: { content, isActive: true },
      create: { key, content, isActive: true },
    })
    return { success: true, data: serialize(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function toggleProfile(
  key: ProfileKey,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.agentProfile.update({ where: { key }, data: { isActive } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

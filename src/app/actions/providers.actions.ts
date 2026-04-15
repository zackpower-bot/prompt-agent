"use server"

import { getAvailableProviders } from "@/lib/providers"
import type { ProviderName } from "@/lib/providers"

export async function getAvailableProviderNames(): Promise<ProviderName[]> {
  return getAvailableProviders()
}

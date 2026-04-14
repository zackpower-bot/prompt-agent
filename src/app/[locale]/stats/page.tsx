import { headers } from "next/headers"
import { getUsageStats } from "@/app/actions/stats.actions"
import { StatsClient } from "./stats-client"

async function getUsageSnapshot() {
  try {
    const headerList = await headers()
    const proto = headerList.get("x-forwarded-proto") ?? "http"
    const host = headerList.get("host")
    const envBase =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
    const baseUrl = host ? `${proto}://${host}` : envBase
    if (!baseUrl) return null
    const res = await fetch(`${baseUrl}/api/usage`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error("Failed to load /api/usage", err)
    return null
  }
}

export default async function StatsPage() {
  const result = await getUsageStats()
  const stats = result.success ? result.data : null
  const usage = await getUsageSnapshot()
  return <StatsClient stats={stats} usage={usage} />
}

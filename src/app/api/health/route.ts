import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAvailableProviders } from "@/lib/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.setting.findFirst({ select: { key: true } })
    const providers = getAvailableProviders()

    return NextResponse.json({
      ok: true,
      database: { ok: true },
      providers: providers.length,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { ok: false, database: { ok: false }, timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}

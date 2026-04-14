import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseAlertMetadata } from "@/lib/alerts"
import { firstOfMonthUTC, startOfNextMonthUTC } from "@/lib/tavily-quota"

const VALID_SEVERITIES = new Set(["info", "warning", "critical"])

export async function GET() {
  const alerts = await prisma.alert.findMany({
    orderBy: [{ acknowledged: "asc" }, { createdAt: "desc" }],
    take: 50,
  })

  const formatted = alerts.map((alert) => ({
    ...alert,
    metadata: parseAlertMetadata(alert.metadata),
  }))
  const unackCount = formatted.filter((alert) => !alert.acknowledged).length

  return NextResponse.json({
    alerts: formatted,
    unackCount,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { type, severity, message, metadata } = body as {
    type?: string
    severity?: string
    message?: string
    metadata?: unknown
  }

  if (!type || !severity || !message) {
    return NextResponse.json({ error: "type, severity, and message are required" }, { status: 400 })
  }

  if (!VALID_SEVERITIES.has(severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 })
  }

  const now = new Date()
  const start = firstOfMonthUTC(now)
  const end = startOfNextMonthUTC(now)
  const existing = await prisma.alert.findFirst({
    where: {
      type,
      acknowledged: false,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing) {
    return NextResponse.json({
      alert: {
        ...existing,
        metadata: parseAlertMetadata(existing.metadata),
      },
      deduped: true,
    })
  }

  const metadataString = metadata === undefined ? "{}" : JSON.stringify(metadata)
  const alert = await prisma.alert.create({
    data: {
      type,
      severity,
      message,
      metadata: metadataString,
    },
  })

  return NextResponse.json(
    {
      alert: {
        ...alert,
        metadata: parseAlertMetadata(metadataString),
      },
      deduped: false,
    },
    { status: 201 }
  )
}

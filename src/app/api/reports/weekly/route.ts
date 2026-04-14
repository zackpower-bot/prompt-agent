import { NextResponse } from "next/server"
import { generateWeeklyReport } from "@/lib/reports/weekly"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const endDate = body && typeof body.endDate === "string" ? body.endDate : undefined

  try {
    const report = await generateWeeklyReport(endDate)
    return NextResponse.json({ path: report.path, summary: report.summary })
  } catch (error) {
    if ((error as Error).message === "Invalid endDate") {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
    }
    console.error("[reports:weekly] Failed to generate report", error)
    return NextResponse.json({ error: "Failed to generate weekly report" }, { status: 500 })
  }
}

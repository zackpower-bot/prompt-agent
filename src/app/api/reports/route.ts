import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"
import { ensureReportsDir, REPORTS_MONTHLY_DIR, REPORTS_WEEKLY_DIR } from "@/lib/reports/common"

export const runtime = "nodejs"

type ListedReport = {
  file: string
  path: string
  modifiedAt: string
  size: number
}

async function listReports(dir: string): Promise<ListedReport[]> {
  try {
    const files = await fs.readdir(dir)
    const entries: ListedReport[] = []
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = await fs.stat(fullPath)
      if (!stat.isFile()) continue
      entries.push({
        file,
        path: path.relative(process.cwd(), fullPath),
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
      })
    }
    entries.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
    return entries
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

export async function GET() {
  await Promise.all([ensureReportsDir("weekly"), ensureReportsDir("monthly")])
  const [weekly, monthly] = await Promise.all([listReports(REPORTS_WEEKLY_DIR), listReports(REPORTS_MONTHLY_DIR)])
  return NextResponse.json({ weekly, monthly })
}

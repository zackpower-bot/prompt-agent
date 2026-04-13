/**
 * Import prompts from prompt-ide JSON export into prompt-agent.
 * Converts JSON string tags to relational Tag + PromptTag.
 *
 * Usage: npx tsx scripts/import-from-prompt-ide.ts [path-to-json]
 * Default: scripts/prompt-ide-export.json
 */
import "dotenv/config"
import { readFileSync } from "node:fs"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const SOURCE_JSON =
  process.argv[2] || "scripts/prompt-ide-export.json"

interface SourcePrompt {
  id: string
  title: string
  description: string
  content: string
  category: string
  model: string
  status: string
  isFavorite: number
  tags: string
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

async function main() {
  console.log(`Source: ${SOURCE_JSON}`)

  const rows = JSON.parse(readFileSync(SOURCE_JSON, "utf8")) as SourcePrompt[]
  console.log(`Found ${rows.length} prompts`)

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  // Clear existing data for clean import
  const existingCount = await prisma.prompt.count()
  if (existingCount > 0) {
    console.log(`Clearing ${existingCount} existing prompts...`)
    await prisma.promptTag.deleteMany()
    await prisma.prompt.deleteMany()
    await prisma.tag.deleteMany()
  }

  // Collect unique tags
  const allTags = new Set<string>()
  for (const row of rows) {
    for (const t of JSON.parse(row.tags || "[]") as string[]) {
      const clean = t.trim().toLowerCase()
      if (clean) allTags.add(clean)
    }
  }
  console.log(`${allTags.size} unique tags`)

  // Create tags
  const tagMap = new Map<string, string>()
  for (const name of allTags) {
    const tag = await prisma.tag.create({ data: { name } })
    tagMap.set(name, tag.id)
  }

  // Import prompts
  let imported = 0
  for (const row of rows) {
    const tags = (JSON.parse(row.tags || "[]") as string[])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && tagMap.has(t))

    await prisma.prompt.create({
      data: {
        id: row.id,
        title: row.title,
        description: row.description || "",
        content: row.content,
        category: row.category || "general",
        model: row.model || "universal",
        status: row.status || "inbox",
        isFavorite: row.isFavorite === 1,
        lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt) : null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        tags: {
          create: tags.map((t) => ({
            tag: { connect: { id: tagMap.get(t)! } },
          })),
        },
      },
    })
    imported++
    if (imported % 50 === 0) console.log(`  ${imported}/${rows.length}`)
  }

  console.log(`\nImported: ${imported}`)
  console.log(`Tags: ${await prisma.tag.count()}`)
  console.log(`PromptTag links: ${await prisma.promptTag.count()}`)

  // Stats
  const tagStats = await prisma.tag.findMany({
    include: { _count: { select: { prompts: true } } },
    orderBy: { name: "asc" },
  })
  console.log("\nTag distribution:")
  for (const t of tagStats) {
    console.log(`  ${t.name}: ${t._count.prompts}`)
  }
}

main().catch((e) => {
  console.error("Import failed:", e)
  process.exit(1)
})

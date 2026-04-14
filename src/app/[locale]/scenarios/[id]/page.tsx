import { notFound } from "next/navigation"

import { getScenarioById } from "@/app/actions/scenario.actions"

import { ScenarioDetailClient } from "./scenario-detail-client"

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const result = await getScenarioById(id)

  if (!result.success) {
    notFound()
  }

  return <ScenarioDetailClient scenario={result.data} locale={locale} />
}

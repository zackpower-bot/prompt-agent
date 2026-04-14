import { notFound } from "next/navigation"

import { getScenarioById } from "@/app/actions/scenario.actions"

import { ScenarioDetailClient } from "./scenario-detail-client"

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ scenarioId: string; locale: string }>
}) {
  const { scenarioId, locale } = await params
  const result = await getScenarioById(scenarioId)

  if (!result.success) {
    notFound()
  }

  return <ScenarioDetailClient scenario={result.data} locale={locale} />
}

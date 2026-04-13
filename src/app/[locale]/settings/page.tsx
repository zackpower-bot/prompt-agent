import { getProfiles } from "@/app/actions/profile.actions"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const result = await getProfiles()
  const profiles = result.success ? result.data : []
  return <SettingsClient initialProfiles={profiles} />
}

import { Suspense } from "react"
import HomeClient from "./home-client"
import { RecentTasksCard, RecentTasksSkeleton } from "@/components/home/recent-tasks"

export default async function HomePage() {
  return (
    <div className="flex h-full flex-col">
      <HomeClient
        recentTasksSlot={
          <Suspense fallback={<RecentTasksSkeleton />}>
            <RecentTasksCard />
          </Suspense>
        }
      />
    </div>
  )
}


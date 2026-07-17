import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getAnalyticsPayload } from "@/lib/analytics-data"
import { AnalyticsClient } from "@/components/analytics/analytics-client"

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const initial = await getAnalyticsPayload(user.id)
  return <AnalyticsClient initial={initial} />
}

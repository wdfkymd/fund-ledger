import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDashboardPayload } from "@/lib/dashboard-data"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const initial = await getDashboardPayload(user.id)
  return <DashboardClient initial={initial} />
}

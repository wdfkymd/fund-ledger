import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getHoldingsPayload } from "@/lib/holdings-data"
import { HoldingsClient } from "@/components/holdings/holdings-client"

export default async function HoldingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const payload = await getHoldingsPayload(user.id)
  return <HoldingsClient initial={payload.holdings} />
}

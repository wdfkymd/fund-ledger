import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getWatchlistPayload } from "@/lib/watchlist-data"
import { WatchlistClient } from "@/components/watchlist/watchlist-client"

export default async function WatchlistPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const payload = await getWatchlistPayload(user.id)
  return <WatchlistClient initial={payload.items} />
}

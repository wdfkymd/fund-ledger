import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getTransactionsPagePayload } from "@/lib/transactions-data"
import { TransactionsClient } from "@/components/transactions/transactions-client"

export default async function TransactionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const payload = await getTransactionsPagePayload(user.id)
  return (
    <TransactionsClient
      initialTxs={payload.transactions}
      initialHoldings={payload.holdings}
    />
  )
}

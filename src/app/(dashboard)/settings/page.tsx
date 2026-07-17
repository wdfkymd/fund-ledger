import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SettingsClient } from "@/components/settings/settings-client"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  return (
    <SettingsClient
      initialUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  )
}

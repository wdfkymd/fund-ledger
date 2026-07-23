import { readFile } from "node:fs/promises"
import path from "node:path"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SettingsClient } from "@/components/settings/settings-client"

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

async function toDataUrl(avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null
  try {
    const ext = path.extname(avatarUrl).replace(/^\./, "")
    const mime = MIME_MAP[ext] ?? "image/jpeg"
    const buf = await readFile(
      path.join(process.cwd(), "data/avatars", path.basename(avatarUrl)),
    )
    return `data:${mime};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const avatarUrl = await toDataUrl(user.avatarUrl)

  return (
    <SettingsClient
      initialUser={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  )
}

import { readFile } from "node:fs/promises"
import path from "node:path"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  let avatarUrl: string | null = user?.avatarUrl ?? null

  if (avatarUrl) {
    try {
      const ext = path.extname(avatarUrl).replace(/^\./, "")
      const mime = MIME_MAP[ext] ?? "image/jpeg"
      const buf = await readFile(
        path.join(process.cwd(), "data/avatars", path.basename(avatarUrl)),
      )
      avatarUrl = `data:${mime};base64,${buf.toString("base64")}`
    } catch {
      avatarUrl = null
    }
  }

  const navUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl,
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <DynamicBreadcrumb />
            </div>
            <div className="ml-auto flex items-center gap-1.5 pr-4">
              <ThemeToggle />
              <NavUser user={navUser} />
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

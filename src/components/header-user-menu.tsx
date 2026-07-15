"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BadgeCheckIcon, LogOutIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type UserInfo = {
  id: string
  email: string
  name: string | null
}

export function HeaderUserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setUser(d.data)
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/sign-in"
    }
  }

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "U")

  const displayName = user?.name ?? "未登录"
  const displayEmail = user?.email ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none",
          "ring-offset-background transition-opacity hover:opacity-90",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "data-popup-open:ring-2 data-popup-open:ring-ring/40",
        )}
        aria-label="账号菜单"
      >
        <Avatar size="sm" className="size-8">
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar size="sm">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-foreground">
                  {displayName}
                </span>
                {displayEmail ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </span>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <BadgeCheckIcon />
            账号设置
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
          <LogOutIcon />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

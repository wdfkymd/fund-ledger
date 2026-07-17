"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  LandmarkIcon,
  StarIcon,
  ChartColumnIcon,
} from "lucide-react"

/** 一眼看结果 */
const navOverview = [
  { title: "总览", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "收益", url: "/analytics", icon: <ChartColumnIcon /> },
]

/** 管仓与关注 */
const navAssets = [
  { title: "持仓", url: "/holdings", icon: <WalletIcon /> },
  { title: "自选", url: "/watchlist", icon: <StarIcon /> },
]

/** 记账流水 */
const navRecords = [
  { title: "交易记录", url: "/transactions", icon: <ArrowLeftRightIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/dashboard"
              onClick={() => {
                if (isMobile) setOpenMobile(false)
              }}
              className={cn(sidebarMenuButtonVariants({ size: "lg" }))}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LandmarkIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">基金记账</span>
                <span className="truncate text-xs text-muted-foreground">
                  Fund Ledger
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navOverview} label="概览" />
        <NavMain items={navAssets} label="资产" />
        <NavMain items={navRecords} label="记录" />
      </SidebarContent>
    </Sidebar>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  TargetIcon,
  SettingsIcon,
  LifeBuoyIcon,
  TrendingUpIcon,
  LandmarkIcon,
} from "lucide-react"

const navDaily = [
  { title: "总览", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "持仓", url: "/holdings", icon: <WalletIcon /> },
  { title: "交易记录", url: "/transactions", icon: <ArrowLeftRightIcon /> },
]

const navInsights = [
  { title: "收益分析", url: "/analytics", icon: <TrendingUpIcon /> },
  { title: "预算设置", url: "/budgets", icon: <TargetIcon /> },
]

const navSecondary = [
  { title: "设置", url: "/settings", icon: <SettingsIcon /> },
  { title: "帮助与支持", url: "/support", icon: <LifeBuoyIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/dashboard"
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
        <NavMain items={navDaily} label="常用" />
        <NavMain items={navInsights} label="分析" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

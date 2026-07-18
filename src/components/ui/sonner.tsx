"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "@/components/theme-provider"

/** 全局 toast 出口；主题跟随项目自有 ThemeProvider */
export function Toaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !bg-background !text-foreground !shadow-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  )
}

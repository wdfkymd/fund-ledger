"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"

const emptySubscribe = () => () => {}
const useIsMounted = () =>
  useSyncExternalStore(emptySubscribe, () => true, () => false)

function ContrastIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  )
}

/**
 * Theme toggle — same markup on server and client so the button
 * does not flash / remount on page refresh (hydration).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useIsMounted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 rounded-full"
      suppressHydrationWarning
      disabled={!mounted}
      onClick={() => {
        if (!mounted) return
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
      }}
      aria-label={
        mounted && resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"
      }
    >
      <ContrastIcon className="size-[18px]" />
      <span className="sr-only">切换主题</span>
    </Button>
  )
}

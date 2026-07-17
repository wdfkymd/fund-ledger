"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import {
  applyDocumentTheme,
  parseTheme,
  THEME_COOKIE,
  type Theme,
  writeThemeCookie,
} from "@/lib/theme"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readThemeCookie(): Theme {
  if (typeof document === "undefined") return "system"
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`),
  )
  return parseTheme(m ? decodeURIComponent(m[1]) : null)
}

function usePrefersDark() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      mq.addEventListener("change", onStoreChange)
      return () => mq.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return "system"
    return readThemeCookie()
  })
  const prefersDark = usePrefersDark()

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme, prefersDark])

  const resolvedTheme: "light" | "dark" =
    theme === "dark" || (theme === "system" && prefersDark) ? "dark" : "light"

  const setTheme = useCallback((next: Theme) => {
    const t = parseTheme(next)
    setThemeState(t)
    writeThemeCookie(t)
    applyDocumentTheme(t)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}

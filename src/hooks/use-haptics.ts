"use client"

import { useCallback } from "react"

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error"

const PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [15, 50, 10],
  error: [30, 30, 30],
}

export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(PATTERNS[pattern])
    }
  }, [])

  return vibrate
}

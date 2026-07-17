"use client"

import { useRouter } from "next/navigation"
import { useRef, useCallback } from "react"

export function usePrefetchOnHover(delay = 100) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const onMouseEnter = useCallback(
    (href: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        router.prefetch(href)
      }, delay)
    },
    [router, delay],
  )

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  return { onMouseEnter, onMouseLeave }
}

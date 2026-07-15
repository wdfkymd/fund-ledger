"use client"

import { useEffect, useRef, type RefObject } from "react"
import { animate, round } from "animejs"

function formatZh(v: number, digits: number) {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/**
 * Animate number changes on a paragraph. First paint is instant (no 0→value).
 * Subsequent value changes ease to the new number.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(
  value: number,
  options?: {
    digits?: number
    duration?: number
    enabled?: boolean
    /** Override number → string (e.g. signed money) */
    format?: (n: number) => string
  },
): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  const prev = useRef<number | null>(null)
  const digits = options?.digits ?? 2
  const duration = options?.duration ?? 480
  const enabled = options?.enabled ?? true
  const format = options?.format

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const write = (n: number) => {
      el.textContent = format ? format(n) : formatZh(n, digits)
    }

    if (!enabled || prefersReducedMotion()) {
      write(value)
      prev.current = value
      return
    }

    if (prev.current == null || prev.current === value) {
      write(value)
      prev.current = value
      return
    }

    const from = prev.current
    prev.current = value
    const proxy = { n: from }

    const anim = animate(proxy, {
      n: value,
      duration,
      ease: "out(3)",
      onUpdate: () => write(round(proxy.n, digits)),
    })

    return () => {
      anim.pause()
      anim.cancel()
    }
  }, [value, digits, duration, enabled, format])

  return ref
}

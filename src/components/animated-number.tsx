"use client"

import { useEffect, useRef, useState } from "react"
import { animate } from "motion"
import { cn } from "@/lib/utils"

type AnimatedNumberProps = {
  value: number
  formatFn?: (v: number) => string
  duration?: number
  className?: string
}

function identity(v: number) {
  return String(v)
}

export function AnimatedNumber({
  value,
  formatFn,
  duration = 0.5,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const animRef = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value) return

    animRef.current?.cancel()
    animRef.current = animate(from, value, {
      duration,
      ease: [0.19, 1, 0.22, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => animRef.current?.cancel()
  }, [value, duration])

  const fmt = formatFn ?? identity

  return <span className={cn("tabular-nums", className)}>{fmt(display)}</span>
}

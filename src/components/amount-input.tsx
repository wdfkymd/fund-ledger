"use client"

import { useCallback, useRef, type ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SHORTCUTS: Record<string, string> = {
  w: "0000",
  k: "000",
  m: "000000",
}

type AmountInputProps = {
  value: string
  onChange: (value: string) => void
  mode?: "money" | "rate"
  placeholder?: string
  required?: boolean
  className?: string
}

export function AmountInput({
  value,
  onChange,
  mode = "money",
  placeholder,
  required,
  className,
}: AmountInputProps) {
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  const formatComma = useCallback((raw: string) => {
    const parts = raw.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
  }, [])

  const stripFormat = useCallback((raw: string) => {
    return raw.replace(/,/g, "")
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const el = e.target
      let raw = el.value

      if (mode === "rate" && raw.startsWith("-")) {
        // pass through for negative rates
      } else if (raw.startsWith("+")) {
        raw = raw.slice(1)
      }

      const lastChar = raw.slice(-1).toLowerCase()
      if (lastChar in SHORTCUTS && raw.length > (selectionRef.current ? Math.abs(selectionRef.current.end - selectionRef.current.start) : 0)) {
        raw = raw.slice(0, -1) + SHORTCUTS[lastChar]
      }

      const clean = stripFormat(raw)

      if (mode === "rate") {
        const prefix = el.value.startsWith("-") ? "-" : ""
        const formatted = prefix ? `-${formatComma(clean.replace(/^-/, ""))}` : formatComma(clean)
        onChange(formatted)
      } else {
        onChange(formatComma(clean))
      }

      requestAnimationFrame(() => {
        if (selectionRef.current) {
          el.setSelectionRange(selectionRef.current.start, selectionRef.current.end)
          selectionRef.current = null
        }
      })
    },
    [onChange, stripFormat, formatComma, mode],
  )

  const numericValue = parseFloat(stripFormat(value))
  const isPositive = !isNaN(numericValue) && numericValue > 0
  const isNegative = !isNaN(numericValue) && numericValue < 0
  const isRate = mode === "rate"

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      onFocus={() => {}}
      onBlur={() => {}}
      placeholder={placeholder}
      required={required}
      className={cn(
        isRate && isPositive && "text-emerald-600 dark:text-emerald-400",
        isRate && isNegative && "text-red-600 dark:text-red-400",
        className,
      )}
    />
  )
}

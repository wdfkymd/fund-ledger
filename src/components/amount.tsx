import { cn } from "@/lib/utils"

type AmountMode = "money" | "signed-money" | "percent" | "nav"

type AmountProps = {
  value: number | null | undefined
  mode?: AmountMode
  className?: string
}

const FMT_2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 } satisfies Intl.NumberFormatOptions

export function Amount({ value, mode = "money", className }: AmountProps) {
  if (value == null) {
    return <span className={cn("font-mono tabular-nums tracking-tight text-muted-foreground", className)}>—</span>
  }

  let text: string
  let colored: boolean

  switch (mode) {
    case "money":
      text = value.toLocaleString("zh-CN", FMT_2)
      colored = false
      break
    case "signed-money": {
      const abs = Math.abs(value)
      const prefix = value > 0 ? "+" : ""
      text = `${prefix}${abs.toLocaleString("zh-CN", FMT_2)}`
      colored = value !== 0
      break
    }
    case "percent": {
      const pct = value * 100
      const prefix = pct > 0 ? "+" : ""
      text = `${prefix}${pct.toFixed(2)}%`
      colored = value !== 0
      break
    }
    case "nav":
      text = value.toFixed(4)
      colored = false
      break
  }

  return (
    <span
      className={cn(
        "font-mono tabular-nums tracking-tight",
        colored && value > 0 && "text-emerald-600 dark:text-emerald-400",
        colored && value < 0 && "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {text}
    </span>
  )
}

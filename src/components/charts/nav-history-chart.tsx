"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  nav: { label: "单位净值", color: "hsl(220 70% 50%)" },
} satisfies ChartConfig

export type NavHistoryPoint = {
  date: string
  nav: number
  label: string
  changePct?: number
}

export function NavHistoryChart({ data }: { data: NavHistoryPoint[] }) {
  return (
    <div className="overflow-hidden rounded-xl border px-2 pb-2 pt-4">
      <ChartContainer
        config={chartConfig}
        className="aspect-[16/9] w-full overflow-hidden"
      >
        <AreaChart
          data={data}
          margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
        >
          <defs>
            <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-nav)"
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor="var(--color-nav)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            interval={0}
            minTickGap={28}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            width={40}
            fontSize={10}
            tickCount={4}
            tickFormatter={(v) => Number(v).toFixed(2)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as
                    | { date?: string }
                    | undefined
                  return p?.date ?? ""
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="var(--color-nav)"
            fill="url(#navFill)"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

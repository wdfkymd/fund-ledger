"use client"

import {
  Bar,
  BarChart,
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
  invest: { label: "投入", color: "hsl(142 60% 40%)" },
  redeem: { label: "赎回", color: "hsl(0 65% 55%)" },
} satisfies ChartConfig

export type MonthlyFlowPoint = {
  month: string
  label: string
  invest: number
  redeem: number
  net: number
  count: number
}

export function MonthlyFlowChart({ data }: { data: MonthlyFlowPoint[] }) {
  return (
    <div className="overflow-hidden rounded-xl border px-2 pb-2 pt-4">
      <ChartContainer
        config={chartConfig}
        className="aspect-[16/9] w-full overflow-hidden"
      >
        <BarChart
          data={data}
          margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            interval={0}
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            fontSize={10}
            tickCount={4}
            tickFormatter={(v) =>
              Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as
                    | { month?: string }
                    | undefined
                  return p?.month ?? ""
                }}
              />
            }
          />
          <Bar
            dataKey="invest"
            fill="var(--color-invest)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="redeem"
            fill="var(--color-redeem)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-center gap-4 pb-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[hsl(142_60%_40%)]" />
          投入
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[hsl(0_65%_55%)]" />
          赎回
        </span>
      </div>
    </div>
  )
}

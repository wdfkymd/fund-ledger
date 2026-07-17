import { Skeleton } from "@/components/ui/skeleton"
import { skeletonStyle } from "@/lib/motion-variants"

function MetricSkeleton() {
  return (
    <div className="min-w-0 overflow-hidden px-2 text-center sm:px-3">
      <Skeleton className="mx-auto h-3 w-10 sm:w-12" />
      <Skeleton className="mx-auto mt-1.5 h-4 w-16 sm:h-5 sm:w-20" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      style={skeletonStyle}
    >
      {/* Market indices */}
      <div className="mb-6 -mx-1 flex gap-2 overflow-hidden px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Total assets */}
      <section className="relative mb-8 text-center">
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto mt-3 h-9 w-40 sm:h-11 sm:w-52" />
        <div className="mt-4 space-y-1">
          <Skeleton className="mx-auto h-4 w-36" />
          <Skeleton className="mx-auto h-3 w-24" />
        </div>

        {/* Summary grid */}
        <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </section>

      {/* Tab bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-4">
          <Skeleton className="h-7 w-14 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>

      {/* Holding list */}
      <div className="divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-4 sm:px-5">
            <div className="flex items-baseline justify-between gap-6">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-36 sm:w-44" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="shrink-0 space-y-2 text-right">
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="mt-8">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

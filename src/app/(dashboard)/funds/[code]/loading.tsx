import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { skeletonStyle } from "@/lib/motion-variants"

function MetricSkeleton() {
  return (
    <div className="min-w-0 overflow-hidden px-2 text-center sm:px-3">
      <Skeleton className="mx-auto h-3 w-10 sm:w-12" />
      <Skeleton className="mx-auto mt-1.5 h-4 w-16 sm:h-5 sm:w-20" />
    </div>
  )
}

export default function FundDetailLoading() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      style={skeletonStyle}
    >
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground"
        tabIndex={-1}
        aria-hidden
      >
        <ArrowLeftIcon className="size-3.5" />
        返回
      </Link>

      {/* Fund header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-44 sm:w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="size-7 shrink-0 rounded-md" />
      </div>

      {/* Quote hero */}
      <section className="mb-8 text-center">
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto mt-3 h-9 w-40 sm:h-11 sm:w-52" />
        <Skeleton className="mx-auto mt-4 h-4 w-28" />
        <Skeleton className="mx-auto mt-1.5 h-3 w-48" />

        {/* Holding metrics grid */}
        <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </section>

      {/* Chart area */}
      <section className="mb-8">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      </section>

      {/* Holding extras */}
      <section className="mb-8">
        <div className="mb-2.5 px-0.5">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-2 rounded-xl border px-4 py-3.5 sm:px-5">
          <Skeleton className="h-3 w-full max-w-xs" />
          <Skeleton className="h-3 w-24" />
        </div>
      </section>

      {/* Transactions */}
      <section>
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
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
      </section>
    </div>
  )
}

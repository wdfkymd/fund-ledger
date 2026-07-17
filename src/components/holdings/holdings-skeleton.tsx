import { Skeleton } from "@/components/ui/skeleton"

const ITEMS = 5

function HoldingRowSkeleton() {
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-36 sm:w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 items-start divide-x rounded-lg bg-muted/40 py-2.5">
        <div className="space-y-1.5 px-1.5 text-center sm:px-2">
          <Skeleton className="mx-auto h-3 w-6" />
          <Skeleton className="mx-auto h-3 w-16" />
        </div>
        <div className="space-y-1.5 px-1.5 text-center sm:px-2">
          <Skeleton className="mx-auto h-3 w-6" />
          <Skeleton className="mx-auto h-3 w-16" />
        </div>
        <div className="space-y-1.5 px-1.5 text-center sm:px-2">
          <Skeleton className="mx-auto h-3 w-6" />
          <Skeleton className="mx-auto h-3 w-16" />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-0.5">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>
    </li>
  )
}

export function HoldingsSkeleton({ count = ITEMS }: { count?: number }) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: count }).map((_, i) => (
          <HoldingRowSkeleton key={i} />
        ))}
      </ul>
    </div>
  )
}

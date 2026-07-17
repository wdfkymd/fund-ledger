import { Skeleton } from "@/components/ui/skeleton"
import { skeletonStyle } from "@/lib/motion-variants"

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      style={skeletonStyle}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-12 rounded-md" />
        ))}
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-8 rounded-md" />
                  <Skeleton className="h-4 w-32 sm:w-44" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

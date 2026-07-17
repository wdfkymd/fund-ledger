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
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-8 rounded-md" />
                <Skeleton className="h-4 w-28 sm:w-36" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <Skeleton className="h-3 w-24" />
              <span className="text-muted-foreground/30">·</span>
              <Skeleton className="h-3 w-12" />
              <span className="text-muted-foreground/30">·</span>
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

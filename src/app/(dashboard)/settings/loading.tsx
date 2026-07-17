import { Skeleton } from "@/components/ui/skeleton"
import { skeletonStyle } from "@/lib/motion-variants"

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      style={skeletonStyle}
    >
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-5 w-12" />
        <Skeleton className="mx-auto mt-1 h-3 w-24" />
      </div>

      {/* Avatar + Profile */}
      <section className="mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </section>

      {/* Form fields */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Theme */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Import/Export */}
      <div className="mt-8 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

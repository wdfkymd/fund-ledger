import { Skeleton } from "@/components/ui/skeleton"
import { skeletonStyle } from "@/lib/motion-variants"

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      style={skeletonStyle}
    >
      <section className="mb-8 text-center">
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto mt-3 h-9 w-40 sm:h-11 sm:w-52" />
        <div className="mt-4 space-y-1">
          <Skeleton className="mx-auto h-4 w-36" />
          <Skeleton className="mx-auto h-3 w-24" />
        </div>
        <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-0 overflow-hidden px-2 text-center sm:px-3">
              <Skeleton className="mx-auto h-3 w-10 sm:w-12" />
              <Skeleton className="mx-auto mt-1.5 h-4 w-16 sm:h-5 sm:w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

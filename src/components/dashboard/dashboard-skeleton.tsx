import { Skeleton } from "@/components/ui/skeleton"

const INDEX_SLOTS = 4

export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="加载中"
    >
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: INDEX_SLOTS }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-[5.5rem] shrink-0 rounded-full" />
        ))}
      </div>

      <section className="relative mb-8 text-center">
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto mt-4 h-10 w-44 sm:h-12 sm:w-52" />
        <Skeleton className="mx-auto mt-4 h-4 w-36" />
        <div className="mt-8 grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3.5 sm:p-4">
          <Skeleton className="mx-auto h-10 w-16" />
          <Skeleton className="mx-auto h-10 w-16" />
          <Skeleton className="mx-auto h-10 w-16" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-xl" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 px-4 py-3.5 sm:px-5">
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="ml-auto h-4 w-20" />
                  <Skeleton className="ml-auto h-3 w-14" />
                </div>
              </div>
              <Skeleton className="h-3 w-full max-w-xs" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

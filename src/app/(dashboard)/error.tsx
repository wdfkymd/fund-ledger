"use client"

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm text-muted-foreground">页面出错了，请重试</p>
      <button
        type="button"
        onClick={reset}
        className="text-sm text-foreground/80 underline-offset-4 hover:underline"
      >
        重试
      </button>
    </div>
  )
}

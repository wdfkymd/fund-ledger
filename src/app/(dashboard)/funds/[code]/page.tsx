import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import {
  FundDetailError,
  getFundDetailPayload,
  type FundDetailPayload,
} from "@/lib/fund-detail-data"
import { FundDetailClient } from "@/components/funds/fund-detail-client"

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const { code } = await params

  let initial: FundDetailPayload | null = null
  let errorMessage: string | null = null
  try {
    // 首屏不强制 refresh，避免外网拖死 TTFB；缺库时 lib 内会拉一次
    initial = await getFundDetailPayload(user.id, code, {
      refresh: false,
      days: 90,
    })
  } catch (error) {
    errorMessage =
      error instanceof FundDetailError
        ? error.message
        : error instanceof Error
          ? error.message
          : "未找到基金"
  }

  if (errorMessage || !initial) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {errorMessage || "未找到基金"}
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm text-foreground/80 hover:text-foreground"
        >
          返回总览
        </Link>
      </div>
    )
  }

  return <FundDetailClient code={code} initial={initial} />
}

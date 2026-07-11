import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 - 基金记账",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

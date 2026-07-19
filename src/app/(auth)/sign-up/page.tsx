"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LandmarkIcon, LoaderCircleIcon } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    const ctl = new AbortController()
    fetch("/api/auth/me", { signal: ctl.signal })
      .then((r) => { if (r.ok) router.replace("/dashboard") })
      .catch(() => {})
    return () => ctl.abort()
  }, [router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })
      const d = await r.json()
      if (d.ok) {
        router.push("/dashboard")
      } else {
        setError(d.error || "注册失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LandmarkIcon className="size-5" />
        </div>
        <CardTitle className="text-xl">注册</CardTitle>
        <CardDescription>创建基金记账账号</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">昵称（可选）</Label>
            <Input
              id="name"
              placeholder="你的昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少 8 位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <LoaderCircleIcon className="mr-1 size-4 animate-spin" />}
            注册
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          已有账号？{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            登录
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

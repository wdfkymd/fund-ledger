"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  LoaderCircleIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  MonitorIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type UserInfo = {
  id: string
  email: string
  name: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [profileMsg, setProfileMsg] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [loggingOut, setLoggingOut] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    setThemeReady(true)
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me")
      if (!r.ok) {
        window.location.href = "/sign-in"
        return
      }
      const d = await r.json()
      if (d.ok && d.data) {
        setUser(d.data)
        setName(d.data.name ?? "")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")
    setProfileMsg("")
    setProfileSaving(true)
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const d = await r.json()
      if (d.ok) {
        setUser(d.data)
        setName(d.data.name ?? "")
        setProfileMsg("昵称已保存")
      } else {
        setProfileError(d.error || "保存失败")
      }
    } catch {
      setProfileError("网络错误")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")
    setPasswordMsg("")
    setPasswordSaving(true)
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setPasswordMsg("密码已更新")
      } else {
        setPasswordError(d.error || "修改失败")
      }
    } catch {
      setPasswordError("网络错误")
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/sign-in"
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        加载中...
      </div>
    )
  }

  const createdLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleString("zh-CN")
    : "-"

  const themeOptions = [
    { value: "light", label: "浅色", icon: SunIcon },
    { value: "dark", label: "深色", icon: MoonIcon },
    { value: "system", label: "跟随系统", icon: MonitorIcon },
  ] as const

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">设置</h1>
        <p className="text-sm text-muted-foreground">管理账号资料、密码与会话</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">账号信息</CardTitle>
            <CardDescription>邮箱用于登录，不可在此修改</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" value={user?.email ?? ""} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">昵称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="显示名称"
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>注册时间：{createdLabel}</p>
              </div>
              {profileError && (
                <p className="text-xs text-red-500">{profileError}</p>
              )}
              {profileMsg && (
                <p className="text-xs text-emerald-600">{profileMsg}</p>
              )}
              <Button type="submit" disabled={profileSaving}>
                {profileSaving && (
                  <LoaderCircleIcon className="mr-1 size-4 animate-spin" />
                )}
                保存昵称
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">修改密码</CardTitle>
            <CardDescription>修改成功后仍保持登录状态</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">当前密码</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少 6 位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
              {passwordMsg && (
                <p className="text-xs text-emerald-600">{passwordMsg}</p>
              )}
              <Button type="submit" disabled={passwordSaving}>
                {passwordSaving && (
                  <LoaderCircleIcon className="mr-1 size-4 animate-spin" />
                )}
                更新密码
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">外观</CardTitle>
            <CardDescription>
              当前：
              {themeReady
                ? resolvedTheme === "dark"
                  ? "深色"
                  : "浅色"
                : "…"}
              {theme === "system" ? "（跟随系统）" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon
                const active = themeReady && theme === opt.value
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className={cn(!active && "text-muted-foreground")}
                    onClick={() => setTheme(opt.value)}
                  >
                    <Icon className="mr-1.5 size-3.5" />
                    {opt.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">会话</CardTitle>
            <CardDescription>退出后需重新登录才能查看持仓</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              登录会话使用 Cookie 保存，约 7 天有效。可在任意设备上退出本浏览器会话。
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <LoaderCircleIcon className="mr-1 size-4 animate-spin" />
              ) : (
                <LogOutIcon className="mr-1 size-4" />
              )}
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

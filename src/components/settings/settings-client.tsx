"use client"

import { useState, useRef } from "react"
import { useTheme } from "@/components/theme-provider"
import type { Theme } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LoaderCircleIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  MonitorIcon,
  DownloadIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ExportType = "holdings" | "transactions" | "watchlist"

type UserInfo = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

export function SettingsClient({ initialUser }: { initialUser: UserInfo }) {
  const [user, setUser] = useState<UserInfo>(initialUser)
  const [name, setName] = useState(initialUser.name ?? "")
  const [profileMsg, setProfileMsg] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [loggingOut, setLoggingOut] = useState(false)
  const [exporting, setExporting] = useState<ExportType | null>(null)
  const [exportError, setExportError] = useState("")
  const { theme, setTheme, resolvedTheme } = useTheme()

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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError("")
    setAvatarSaving(true)
    try {
      const form = new FormData()
      form.append("avatar", file)
      const r = await fetch("/api/auth/avatar", { method: "POST", body: form })
      const d = await r.json()
      if (d.ok) {
        setUser((prev) => ({ ...prev, avatarUrl: d.data.avatarUrl }))
      } else {
        setAvatarError(d.error || "上传失败")
      }
    } catch {
      setAvatarError("网络错误")
    } finally {
      setAvatarSaving(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  async function handleAvatarDelete() {
    setAvatarError("")
    setAvatarSaving(true)
    try {
      const r = await fetch("/api/auth/avatar", { method: "DELETE" })
      const d = await r.json()
      if (d.ok) {
        setUser((prev) => ({ ...prev, avatarUrl: null }))
      } else {
        setAvatarError(d.error || "删除失败")
      }
    } catch {
      setAvatarError("网络错误")
    } finally {
      setAvatarSaving(false)
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

  async function handleExport(type: ExportType) {
    setExportError("")
    setExporting(type)
    try {
      const r = await fetch(`/api/export?type=${type}`)
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setExportError(d?.error || "导出失败")
        return
      }
      const blob = await r.blob()
      const cd = r.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(cd)
      const filename =
        match?.[1] ??
        `fund-ledger-${type}-${new Date().toISOString().slice(0, 10)}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setExportError("网络错误")
    } finally {
      setExporting(null)
    }
  }

  const createdLabel = user.createdAt
    ? new Date(user.createdAt).toLocaleString("zh-CN")
    : "—"

  const themeOptions = [
    { value: "light", label: "浅色", icon: SunIcon },
    { value: "dark", label: "深色", icon: MoonIcon },
    { value: "system", label: "系统", icon: MonitorIcon },
  ] as const

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-base font-semibold tracking-tight">设置</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          账号、数据导出、外观与会话
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">账号</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              邮箱用于登录，不可修改
            </p>
          </div>
          <form onSubmit={handleProfile} className="space-y-4 px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs text-muted-foreground">
                邮箱
              </label>
              <Input
                id="email"
                value={user.email}
                disabled
                readOnly
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs text-muted-foreground">
                昵称
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="显示名称"
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">头像</label>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.name ?? ""} />
                  )}
                  <AvatarFallback>
                    {(user.name ?? user.email).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-1.5">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarSaving}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarSaving ? (
                      <LoaderCircleIcon className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <UploadIcon className="mr-1 size-3.5" />
                    )}
                    {user.avatarUrl ? "更换" : "上传"}
                  </Button>
                  {user.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={avatarSaving}
                      onClick={handleAvatarDelete}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <XIcon className="mr-1 size-3.5" />
                      删除
                    </Button>
                  )}
                </div>
              </div>
              {avatarError && (
                <p className="text-xs text-red-500">{avatarError}</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              注册时间 {createdLabel}
            </p>
            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}
            {profileMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {profileMsg}
              </p>
            )}
            <Button type="submit" size="sm" disabled={profileSaving}>
              {profileSaving && (
                <LoaderCircleIcon className="mr-1 size-3.5 animate-spin" />
              )}
              保存昵称
            </Button>
          </form>
        </section>

        {/* Password */}
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">密码</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              修改后仍保持登录
            </p>
          </div>
          <form
            onSubmit={handlePassword}
            className="space-y-4 px-4 py-4 sm:px-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="text-xs text-muted-foreground"
              >
                当前密码
              </label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs text-muted-foreground"
                >
                  新密码
                </label>
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
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs text-muted-foreground"
                >
                  确认新密码
                </label>
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
            </div>
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            {passwordMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {passwordMsg}
              </p>
            )}
            <Button type="submit" size="sm" disabled={passwordSaving}>
              {passwordSaving && (
                <LoaderCircleIcon className="mr-1 size-3.5 animate-spin" />
              )}
              更新密码
            </Button>
          </form>
        </section>

        {/* Export */}
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">数据导出</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              下载 UTF-8 CSV，可用 Excel / Numbers 打开
            </p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { type: "holdings" as const, label: "持仓" },
                  { type: "transactions" as const, label: "交易记录" },
                  { type: "watchlist" as const, label: "自选" },
                ] as const
              ).map((item) => (
                <Button
                  key={item.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => handleExport(item.type)}
                >
                  {exporting === item.type ? (
                    <LoaderCircleIcon className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <DownloadIcon className="mr-1 size-3.5" />
                  )}
                  导出{item.label}
                </Button>
              ))}
            </div>
            {exportError && (
              <p className="text-xs text-red-500">{exportError}</p>
            )}
          </div>
        </section>

        {/* Theme */}
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">外观</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              当前 {resolvedTheme === "dark" ? "深色" : "浅色"}
              {theme === "system" ? " · 跟随系统" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 p-4 sm:px-5">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              const active = theme === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value as Theme)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-foreground/20 bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Session */}
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">会话</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cookie 约 7 天有效，退出后需重新登录
            </p>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-muted-foreground hover:text-red-600"
            >
              {loggingOut ? (
                <LoaderCircleIcon className="mr-1 size-3.5 animate-spin" />
              ) : (
                <LogOutIcon className="mr-1 size-3.5" />
              )}
              退出登录
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-lg font-semibold">设置</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号信息</CardTitle>
          <CardDescription>修改昵称、密码等功能即将上线</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">功能开发中，敬请期待</p>
        </CardContent>
      </Card>
    </div>
  )
}

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { THEME_BOOT_SCRIPT } from "@/lib/theme"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: [
    "system-ui",
    "Segoe UI",
    "Roboto",
    "PingFang SC",
    "Microsoft YaHei",
    "sans-serif",
  ],
})

/** 仅图表等偶发使用；不 preload */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
})

export const metadata: Metadata = {
  title: "基金记账",
  description: "个人基金持仓记账工具",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // html 不挂 React className，避免 hydrate 冲掉 boot 脚本写的 .dark
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-background antialiased font-sans`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

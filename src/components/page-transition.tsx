"use client"

import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { DURATION, EASE } from "@/lib/motion-variants"

/**
 * (dashboard) 路由过渡：pathname 作 key，页面切换时旧页 fade+slide 退出、新页进入。
 * mode="wait" 避免新旧页面同屏挤压布局；退出时长压短减少感知延迟。
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="flex flex-1 flex-col"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{
          opacity: 0,
          y: -8,
          transition: { duration: DURATION.fast, ease: EASE.exit },
        }}
        transition={{ duration: DURATION.normal, ease: EASE.enter }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

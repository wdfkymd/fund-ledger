import { type ReactNode, useRef, useState } from "react"
import { motion } from "motion/react"
import { useSidebar } from "@/components/ui/sidebar"

type SwipeAction = {
  label: string
  className?: string
  onAction: () => void
}

type SwipeableRowProps = {
  children: ReactNode
  actions?: SwipeAction[]
  threshold?: number
  className?: string
}

const DEFAULT_ACTIONS: SwipeAction[] = [
  { label: "删除", className: "bg-red-600 text-white", onAction: () => {} },
]

export function SwipeableRow({
  children,
  actions = DEFAULT_ACTIONS,
  threshold = 80,
  className,
}: SwipeableRowProps) {
  const { isMobile } = useSidebar()
  const [swiped, setSwiped] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  const actionWidth = actions.length * 72

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -threshold) {
            setSwiped(true)
          } else {
            setSwiped(false)
          }
        }}
        animate={{ x: swiped ? -actionWidth : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={className}
      >
        {children}
      </motion.div>

      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setSwiped(false)
              action.onAction()
            }}
            className={`flex w-18 items-center justify-center text-xs font-medium ${action.className ?? "bg-muted text-foreground"}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

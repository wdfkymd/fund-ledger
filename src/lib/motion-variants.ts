export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.4,
} as const

export const EASE = {
  enter: "easeOut",
  exit: "easeIn",
} as const

export const STAGGER = {
  item: 0.05,
} as const

export const container = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.fast, ease: EASE.enter },
}

export const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.normal, ease: EASE.enter },
}

export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.normal, ease: EASE.enter },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.normal, ease: EASE.enter },
}

export function staggerItem(i: number, skipInitial = false) {
  return {
    initial: skipInitial ? false : item.initial,
    animate: item.animate,
    transition: { ...item.transition, delay: skipInitial ? 0 : i * STAGGER.item },
  }
}

export const skeletonStyle = {
  animation: "skeleton-fade-in 0.15s ease-out forwards",
  opacity: 0 as const,
}

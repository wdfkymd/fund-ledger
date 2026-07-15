"use client"

import { useRef, type RefObject } from "react"
import { animate, stagger } from "animejs"
import { useAnimeScope } from "@/hooks/use-anime-scope"

/**
 * Anime enter language (project convention):
 * - Sections: class `anime-enter` → opacity + translateY, 360ms, stagger 40ms
 * - Rows: class `anime-list-item` → opacity + translateY, 280ms, stagger 24ms (start 100ms)
 * - Numbers: use `useCountUp` (first paint instant)
 * - Always honor prefers-reduced-motion
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export type PageEnterOptions = {
  /** Section selector inside root. Default `.anime-enter` */
  sectionSelector?: string
  /** List row selector. Default `.anime-list-item` */
  itemSelector?: string
}

/**
 * One-shot page enter when `active` first becomes true.
 * Attach returned ref to a root element that contains marked children.
 */
export function usePageEnter(
  active: boolean,
  options?: PageEnterOptions,
): RefObject<HTMLDivElement | null> {
  const played = useRef(false)
  const sectionSelector = options?.sectionSelector ?? ".anime-enter"
  const itemSelector = options?.itemSelector ?? ".anime-list-item"

  return useAnimeScope(() => {
    if (!active || played.current) return
    played.current = true
    if (prefersReducedMotion()) return

    animate(sectionSelector, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 360,
      ease: "out(3)",
      delay: stagger(40),
    })

    animate(itemSelector, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: 280,
      ease: "out(3)",
      delay: stagger(24, { start: 100 }),
    })
  }, [active, sectionSelector, itemSelector])
}

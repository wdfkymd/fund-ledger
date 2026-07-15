"use client"

import { useEffect, useRef, type DependencyList, type RefObject } from "react"
import { createScope, type Scope } from "animejs"

type ScopeSetup = (scope: Scope) => void

/**
 * React lifecycle wrapper for anime.js v4 createScope.
 * Cleans up via scope.revert() on unmount or deps change.
 */
export function useAnimeScope(
  setup: ScopeSetup,
  deps: DependencyList = [],
): RefObject<HTMLDivElement | null> {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const setupRef = useRef(setup)

  useEffect(() => {
    setupRef.current = setup
  })

  useEffect(() => {
    if (!rootRef.current) return

    const scope = createScope({ root: rootRef }).add((self) => {
      if (!self) return
      setupRef.current(self)
    })

    return () => {
      scope.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps
  }, deps)

  return rootRef
}

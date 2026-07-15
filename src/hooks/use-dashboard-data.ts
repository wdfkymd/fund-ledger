"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchDashboardSnapshot,
  refreshDashboardEstimates,
} from "@/lib/dashboard-data"
import type { DashboardSnapshot } from "@/components/dashboard/types"
import { ApiError, isAbortError } from "@/lib/client-api"

export type DashboardStatus = "loading" | "ready" | "error"

type State = {
  status: DashboardStatus
  data: DashboardSnapshot
  error: string | null
  refreshing: boolean
}

const EMPTY: DashboardSnapshot = {
  holdings: [],
  watchlist: [],
  recentTxs: [],
  summary: null,
  indices: [],
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "请先登录"
    return error.message
  }
  if (error instanceof Error) return error.message
  return "加载失败"
}

export function useDashboardData() {
  const [state, setState] = useState<State>({
    status: "loading",
    data: EMPTY,
    error: null,
    refreshing: false,
  })

  const mounted = useRef(true)
  const autoEstimateDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    setState((s) => ({
      ...s,
      status: "loading",
      error: null,
    }))

    try {
      const data = await fetchDashboardSnapshot()
      if (!mounted.current) return
      setState({
        status: "ready",
        data,
        error: null,
        refreshing: false,
      })
    } catch (error) {
      if (isAbortError(error) || !mounted.current) return
      setState((s) => ({
        ...s,
        status: "error",
        error: toMessage(error),
        refreshing: false,
      }))
    }
  }, [])

  /** force=true: 用户点刷新（转圈）；false: 进页静默 */
  const refreshEstimates = useCallback(async (force = false) => {
    if (!mounted.current) return
    if (force) {
      setState((s) => ({ ...s, refreshing: true }))
    }

    try {
      const data = await refreshDashboardEstimates(undefined, { force })
      if (!mounted.current) return
      setState((s) => ({
        ...s,
        status: "ready",
        data,
        error: null,
        refreshing: false,
      }))
    } catch (error) {
      if (isAbortError(error) || !mounted.current) return
      setState((s) => ({
        ...s,
        refreshing: false,
        error: s.status === "ready" ? null : toMessage(error),
      }))
    }
  }, [])

  // 首屏：四路并行到齐再 ready（指数已换腾讯，通常很快）
  useEffect(() => {
    const ac = new AbortController()

    void (async () => {
      try {
        const data = await fetchDashboardSnapshot(ac.signal)
        if (!mounted.current) return
        setState({
          status: "ready",
          data,
          error: null,
          refreshing: false,
        })
      } catch (error) {
        if (isAbortError(error) || !mounted.current) return
        setState((s) => ({
          ...s,
          status: "error",
          error: toMessage(error),
        }))
      }
    })()

    return () => ac.abort()
  }, [])

  const holdingCount = state.data.holdings.length
  const watchCount = state.data.watchlist.length

  useEffect(() => {
    if (state.status !== "ready" || autoEstimateDone.current) return
    autoEstimateDone.current = true
    if (holdingCount === 0 && watchCount === 0) return
    void refreshEstimates(false)
  }, [state.status, holdingCount, watchCount, refreshEstimates])

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    refreshing: state.refreshing,
    reload,
    refreshEstimates,
  }
}

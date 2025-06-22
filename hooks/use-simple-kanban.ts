"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { Lead } from "@/types/kanban"

interface Column {
  id: string
  title: string
  color: string
  leads: Lead[]
  hasMore: boolean
  loading: boolean
}

interface UseSimpleKanbanResult {
  columns: Column[]
  loading: boolean
  error: string | null
  loadMore: () => Promise<void>
  refetch: () => void
}

const COLUMN_CONFIG = [
  { id: "leads", title: "Leads", color: "#f59e0b" },
  { id: "questionnaire", title: "Questionnaire", color: "#3b82f6" },
  { id: "quotation", title: "Quotation", color: "#10b981" },
  { id: "details-passed", title: "Details Passed", color: "#8b5cf6" },
  { id: "lost-cases", title: "Lost Cases", color: "#ef4444" },
  { id: "others", title: "Others", color: "#6b7280" },
]

export function useSimpleKanban(): UseSimpleKanbanResult {
  const [columns, setColumns] = useState<Column[]>(
    COLUMN_CONFIG.map((config) => ({
      ...config,
      leads: [],
      hasMore: true,
      loading: false,
    })),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [globalHasMore, setGlobalHasMore] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Use refs to prevent race conditions
  const initialLoadDone = useRef(false)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Stable load function
  const loadBatch = useCallback(async (page: number, isInitial = false) => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log("Kanban: Load already in progress, skipping")
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      if (isInitial) {
        setLoading(true)
      }
      loadingRef.current = true
      setError(null)

      console.log(`Kanban: Loading batch ${page}`)

      const response = await fetch(`/api/leads-simple?type=kanban&page=${page}&limit=100`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to load leads")
      }

      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setColumns((prevColumns) =>
          prevColumns.map((col) => {
            const newLeads = data?.categorizedLeads?.[col.id] || []
            const existingLeads = isInitial ? [] : col.leads

            // Combine and deduplicate leads
            const allLeads = [...existingLeads, ...newLeads]
            const uniqueLeads = new Map()
            allLeads.forEach((lead) => {
              uniqueLeads.set(lead.id, lead)
            })

            return {
              ...col,
              leads: Array.from(uniqueLeads.values()),
              hasMore: data.hasMore,
              loading: false,
            }
          }),
        )

        setGlobalHasMore(data.hasMore)
        setCurrentPage(page)

        console.log(`Kanban: Successfully loaded batch ${page}, hasMore: ${data.hasMore}`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Kanban request was aborted")
        return
      }

      const errorMessage = err instanceof Error ? err.message : "Failed to load kanban data"
      setError(errorMessage)
      console.error("Kanban error:", errorMessage)
    } finally {
      if (isInitial) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!globalHasMore || loadingRef.current) {
      console.log("Kanban: Cannot load more - hasMore:", globalHasMore, "loading:", loadingRef.current)
      return
    }

    try {
      setColumns((prev) => prev.map((col) => ({ ...col, loading: true })))
      const nextPage = currentPage + 1
      await loadBatch(nextPage, false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load more data")
    } finally {
      setColumns((prev) => prev.map((col) => ({ ...col, loading: false })))
    }
  }, [currentPage, globalHasMore, loadBatch])

  const refetch = useCallback(() => {
    console.log("Kanban: Manual refetch triggered")
    setCurrentPage(1)
    setGlobalHasMore(true)
    setColumns(
      COLUMN_CONFIG.map((config) => ({
        ...config,
        leads: [],
        hasMore: true,
        loading: false,
      })),
    )
    loadBatch(1, true)
  }, [loadBatch])

  // Mount effect - runs once
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-load effect - runs when mounted
  useEffect(() => {
  if (
    mounted &&
    !loadingRef.current &&
    columns.every((col) => col.leads.length === 0) &&
    !error &&
    !initialLoadDone.current
  ) {
    console.log("Kanban: Auto-loading initial data")
    initialLoadDone.current = true
    loadBatch(1, true)
  }
}, [mounted, columns, error, loadBatch])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return useMemo(
    () => ({
      columns,
      loading,
      error,
      loadMore,
      refetch,
    }),
    [columns, loading, error, loadMore, refetch],
  )
}

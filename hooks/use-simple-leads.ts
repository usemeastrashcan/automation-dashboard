"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDebounce } from "./use-debounce"

// Constants
const REQUEST_TIMEOUT = 45000 // 45 seconds
const MAX_RETRIES = 2
const RETRY_DELAYS = [2000, 5000] // 2s, 5s
const INITIAL_LOAD_DELAY = 100 // Small delay for initial load

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  status: "pending" | "active" | "completed"
  activity?: string
  createdAt: string
}

interface UseSimpleLeadsOptions {
  searchTerm?: string
  pageSize?: number
  autoLoad?: boolean
}

interface UseSimpleLeadsReturn {
  leads: Lead[]
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  hasMore: boolean
  searchTerm: string
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  refetch: () => void
}

export function useSimpleLeads({
  searchTerm = "",
  pageSize = 20,
  autoLoad = true,
}: UseSimpleLeadsOptions = {}): UseSimpleLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 500)
  
  const currentRequestRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const lastSearchTermRef = useRef<string | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadDone = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const fetchLeads = useCallback(
    async (page: number, search: string, isRefetch = false, retryCount = 0) => {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }

      const abortController = new AbortController()
      currentRequestRef.current = abortController

      // Add timeout
      const timeoutId = setTimeout(() => {
        console.log("⏰ Request timeout reached")
        abortController.abort()
      }, REQUEST_TIMEOUT)

      try {
        if (page === 1 || isRefetch) {
          setLoading(true)
          setError(null)
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          type: "records",
        })

        if (search) {
          params.append("search", search)
        }

        console.log(`🔍 Fetching leads: page=${page}, search="${search}", attempt=${retryCount + 1}/${MAX_RETRIES + 1}`)

        const response = await fetch(`/api/leads-simple?${params}`, {
          signal: abortController.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        clearTimeout(timeoutId)

        if (!mountedRef.current || abortController.signal.aborted) {
          console.log("🚫 Component unmounted or request aborted")
          return
        }

        console.log(`📡 Response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ API Error Response:", errorText)

          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.message || errorMessage
          } catch {
            // Use the raw text if it's not JSON
            if (errorText.length > 0 && errorText.length < 200) {
              errorMessage = errorText
            }
          }

          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log("📊 API Response:", {
          success: data.success,
          leadsCount: data.leads?.length || 0,
          hasMore: data.hasMore,
          message: data.message,
        })

        if (!data.success) {
          throw new Error(data.message || "API request failed")
        }

        const fetchedLeads = data.leads || []

        console.log(`✅ Successfully fetched ${fetchedLeads.length} leads for page ${page}`)

        if (mountedRef.current && !abortController.signal.aborted) {
          setLeads(fetchedLeads)
          setHasMore(data.hasMore || false)
          setCurrentPage(page)
          setTotalPages(fetchedLeads.length > 0 ? (data.hasMore ? page + 1 : page) : 1)

          // If no results, record this search to prevent loop
          if (fetchedLeads.length === 0 && page === 1) {
            lastSearchTermRef.current = search
          }
        }
      } catch (err) {
        clearTimeout(timeoutId)

        if (mountedRef.current && !abortController.signal.aborted) {
          console.error("❌ Fetch error:", err)

          if (err instanceof Error) {
            if (err.name === "AbortError" || err.message.includes("aborted")) {
              console.log("🚫 Request was aborted (timeout or manual)")

              // Retry on timeout if we haven't exceeded max retries
              if (retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount]
                console.log(`🔄 Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)

                retryTimeoutRef.current = setTimeout(() => {
                  if (mountedRef.current) {
                    fetchLeads(page, search, isRefetch, retryCount + 1)
                  }
                }, delay)
                return
              } else {
                setError("Request timed out after multiple attempts. Please check your connection and try again.")
              }
              return
            }

            console.error("❌ API Error:", err.message)
            setError(err.message)

            // Handle specific error cases
            if (err.message.includes("No") || err.message.includes("not found")) {
              setLeads([])
              setHasMore(false)
              setTotalPages(1)
              lastSearchTermRef.current = search
            }
          } else {
            console.error("❌ Unknown error:", err)
            setError("An unexpected error occurred. Please try again.")
          }
        }
      } finally {
        clearTimeout(timeoutId)

        if (mountedRef.current && !abortController.signal.aborted) {
          setLoading(false)
        }

        if (currentRequestRef.current === abortController) {
          currentRequestRef.current = null
        }
      }
    },
    [pageSize],
  )

  // Initial load effect
  useEffect(() => {
    if (autoLoad && !initialLoadDone.current && leads.length === 0 && !loading) {
      initialLoadDone.current = true
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          fetchLeads(1, debouncedSearchTerm)
        }
      }, INITIAL_LOAD_DELAY)
      
      return () => clearTimeout(timer)
    }
  }, [autoLoad, debouncedSearchTerm, leads.length, loading, fetchLeads])

  // Reset initial load flag when search term changes
  useEffect(() => {
    initialLoadDone.current = false
  }, [debouncedSearchTerm])

  // Search change effect
  useEffect(() => {
    if (!autoLoad) return
    
    // Reset last search term if the search is cleared
    if (debouncedSearchTerm === "") {
      lastSearchTermRef.current = null
    }

    // Skip if this is the same search that returned no results
    if (debouncedSearchTerm === lastSearchTermRef.current) {
      return
    }

    console.log(`🔄 Search term changed to: "${debouncedSearchTerm}"`)
    setCurrentPage(1)
    fetchLeads(1, debouncedSearchTerm)
  }, [debouncedSearchTerm, autoLoad, fetchLeads])

  const goToPage = useCallback(
    (page: number) => {
      if (page !== currentPage && page > 0) {
        fetchLeads(page, debouncedSearchTerm)
      }
    },
    [currentPage, debouncedSearchTerm, fetchLeads],
  )

  const nextPage = useCallback(() => {
    if (hasMore) {
      goToPage(currentPage + 1)
    }
  }, [hasMore, currentPage, goToPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage])

  const refetch = useCallback(() => {
    console.log("🔄 Manual refetch triggered")
    lastSearchTermRef.current = null // allow retry
    setError(null)
    fetchLeads(currentPage, debouncedSearchTerm, true)
  }, [currentPage, debouncedSearchTerm, fetchLeads])

  return {
    leads,
    loading,
    error,
    currentPage,
    totalPages,
    hasMore,
    searchTerm: debouncedSearchTerm,
    goToPage,
    nextPage,
    prevPage,
    refetch,
  }
}
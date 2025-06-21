"use client"

import { useEffect, useRef, useCallback } from "react"
import { LeadCard } from "./lead-card"
import type { Lead } from "@/types/kanban"

interface SimpleKanbanColumnProps {
  columnId: string
  title: string
  color: string
  leads: Lead[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => Promise<void>
}

export function SimpleKanbanColumn({
  columnId,
  title,
  color,
  leads,
  hasMore,
  loading,
  onLoadMore,
}: SimpleKanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      onLoadMore()
    }
  }, [hasMore, loading, onLoadMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 },
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])

  return (
    <div className="flex-1 min-w-[280px] border rounded-lg shadow-sm">
      <div
        className="rounded-t-lg p-3 text-white font-medium text-sm flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <span>{title}</span>
        <span className="bg-white/20 px-2 py-1 rounded text-xs">{leads.length}</span>
      </div>

      <div
        ref={scrollRef}
        className="bg-gray-50 min-h-[600px] max-h-[calc(100vh-250px)] p-3 rounded-b-lg overflow-y-auto"
      >
        {leads.length === 0 && !loading ? (
          <div className="text-center text-muted-foreground text-sm mt-8">No records</div>
        ) : (
          <>
            {leads.map((lead, index) => (
              <LeadCard key={`${lead.id}-${index}`} lead={lead} />
            ))}

            {/* Loading indicator */}
            <div ref={loadingRef} className="py-4">
              {loading && (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  <span className="ml-2 text-xs text-gray-600">Loading...</span>
                </div>
              )}
              {!hasMore && leads.length > 0 && (
                <div className="text-center text-xs text-gray-500">All leads loaded</div>
              )}
              {hasMore && !loading && leads.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    className="text-xs text-blue-600 hover:underline px-3 py-1 rounded bg-blue-50"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

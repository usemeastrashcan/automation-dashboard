"use client"

import { Header } from "@/components/header"
import { SimpleKanbanColumn } from "@/components/simple-kanban-column"
import { useSimpleKanban } from "@/hooks/use-simple-kanban"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function KanbanPage() {
  const { columns, loading, error, loadMore, refetch } = useSimpleKanban()

  if (error) {
    const isRateLimit = error.includes("rate limit") || error.includes("wait") || error.includes("retry")

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-10">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-600 mb-2">
              {isRateLimit ? "Temporary Service Delay" : "Error loading kanban data"}
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            {isRateLimit ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-600">
                  The system is automatically handling authentication. Please wait a moment and try again.
                </p>
                <button
                  onClick={refetch}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <button
                onClick={refetch}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Lead Pipeline</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading pipeline..." : "Showing leads from Zoho CRM"}
              </p>
            </div>
            <button
              onClick={refetch}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border rounded-lg shadow-sm animate-pulse">
                  <div className="h-12 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-3 space-y-3">
                    <div className="h-20 bg-gray-100 rounded"></div>
                    <div className="h-20 bg-gray-100 rounded"></div>
                    <div className="h-20 bg-gray-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map((column) => (
                <SimpleKanbanColumn
                  key={column.id}
                  columnId={column.id}
                  title={column.title}
                  color={column.color}
                  leads={column.leads}
                  hasMore={column.hasMore}
                  loading={column.loading}
                  onLoadMore={loadMore}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

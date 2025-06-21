"use client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  hasMore: boolean
  onPageChange: (page: number) => void
  onNext: () => void
  onPrev: () => void
  loading?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  onNext,
  onPrev,
  loading = false,
}: PaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, currentPage + 2)

      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push("...")
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...")
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center px-4 py-6 bg-white border-t border-gray-200">
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={onPrev}
          disabled={currentPage <= 1 || loading}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              onClick={() => (typeof page === "number" ? onPageChange(page) : undefined)}
              disabled={loading || page === "..."}
              className={`px-3 py-2 text-sm font-medium border rounded-md ${
                page === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : page === "..."
                    ? "bg-white text-gray-400 border-gray-300 cursor-default"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={!hasMore || loading}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="ml-4 flex items-center text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
          Loading...
        </div>
      )}
    </div>
  )
}

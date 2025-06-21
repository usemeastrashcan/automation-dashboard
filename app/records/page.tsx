"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { LeadCard } from "@/components/lead-card"
import { Pagination } from "@/components/pagination"
import { Input } from "@/components/ui/input"
import { Search, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { useSimpleLeads } from "@/hooks/use-simple-leads"

export default function AllRecordsPage() {
  const [searchInput, setSearchInput] = useState("")

  // Use the hook with the search input
  const { leads, loading, error, currentPage, totalPages, hasMore, searchTerm, goToPage, nextPage, prevPage, refetch } =
    useSimpleLeads({
      searchTerm: searchInput,
      pageSize: 20,
      autoLoad: true,
    })

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log(`🔍 Search input changed: "${value}"`)
    setSearchInput(value)
  }, [])

  const handleRefresh = useCallback(() => {
    console.log("🔄 Refresh button clicked")
    refetch()
  }, [refetch])

  // Add this after the existing handleRefresh function
const handleRetry = useCallback(() => {
  console.log("🔄 Manual retry triggered")
  window.location.reload()
}, [])


  // Error handling with better UX
  if (error && !loading) {
    const isRateLimit = error.includes("rate limit") || error.includes("wait") || error.includes("retry")
    const isSearchError = error.includes("No") || error.includes("not found") || searchTerm.length > 0

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Header section */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">All Records</h2>
                <p className="text-sm text-muted-foreground">
                  {isSearchError ? `No results found for "${searchTerm}"` : "Error loading records"}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                className="pl-9"
                value={searchInput}
                onChange={handleSearchChange}
                disabled={loading && leads.length === 0}
              />
              {loading && searchInput && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Error display */}
            {!isSearchError && (
              <div className="text-center py-10">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-amber-600 mb-2">
                  {isRateLimit ? "Temporary Service Delay" : "Error loading leads"}
                </h2>
                <p className="text-gray-600 mb-4">{error}</p>
                {isRateLimit ? (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-600">
                      The system is automatically handling authentication. Please wait a moment and try again.
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}
              </div>
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
          {/* Header section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">All Records</h2>
              <p className="text-sm text-muted-foreground">
                {loading && leads.length === 0
                  ? searchInput
                    ? `Searching for "${searchInput}"...`
                    : "Loading records..."
                  : leads.length > 0
                    ? `Showing ${leads.length} records${searchTerm ? ` for "${searchTerm}"` : ""}`
                    : searchTerm
                      ? `No records found for "${searchTerm}"`
                      : "No records available"}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-9"
              value={searchInput}
              onChange={handleSearchChange}
              disabled={loading && leads.length === 0}
            />
            {loading && searchInput && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Loading state for initial load */}
          {loading && leads.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {searchInput ? `Searching for "${searchInput}"...` : "Loading records..."}
                </p>
                <p className="text-sm text-gray-500 mt-2">This may take a moment</p>

                {/* Add retry button after 10 seconds of loading */}
                <div className="mt-4">
                  <button onClick={handleRetry} className="text-sm text-blue-600 hover:text-blue-800 underline">
                    Taking too long? Click to retry
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Results section */}
              <div className="bg-white rounded-lg shadow">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                  {leads.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground text-lg py-10">
                      {searchTerm ? (
                        <div>
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No records found for "{searchTerm}"</p>
                          <p className="text-sm mt-2">Try a different search term or check spelling</p>
                        </div>
                      ) : (
                        <div>
                          <p>No records available</p>
                          <p className="text-sm mt-2">Records will appear here when loaded</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    leads.map((lead, index) => <LeadCard key={`${lead.id}-${index}`} lead={lead} />)
                  )}
                </div>

                {/* Pagination - only show if we have leads or multiple pages */}
                {(leads.length > 0 || totalPages > 1) && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasMore={hasMore}
                    onPageChange={goToPage}
                    onNext={nextPage}
                    onPrev={prevPage}
                    loading={loading}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

// Add memory management
const MAX_BATCH_SIZE = 50 // Reduce batch size to prevent memory issues
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

// Simple in-memory cache with size limits
const cache = new Map<string, { data: any; timestamp: number }>()
const MAX_CACHE_SIZE = 10

function cleanCache() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    cache.delete(oldestKey!)
  }
}

function getCachedData(key: string) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCachedData(key: string, data: any) {
  cleanCache()
  cache.set(key, { data, timestamp: Date.now() })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20", 10), MAX_BATCH_SIZE)
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || "records"

    console.log(`API: Simple leads fetch - page: ${page}, type: ${type}`)

    // Create cache key
    const cacheKey = `leads-${page}-${limit}-${search}-${type}`

    // Check cache first
    const cachedResult = getCachedData(cacheKey)
    if (cachedResult) {
      console.log(`Using cached leads for page ${page}`)
      return NextResponse.json(cachedResult)
    }

    console.log("Using REST API for regular loading")

    const result = search
  ? await zohoCRM.searchLeadsREST(search, page, limit)
  : await zohoCRM.getLeadsREST(page, limit)

    // Process data in smaller chunks to avoid memory issues
    const transformedLeads = []
    const batchSize = 10

    for (let i = 0; i < result.data.length; i += batchSize) {
      const batch = result.data.slice(i, i + batchSize)
      const transformedBatch = batch.map((lead: any) => ({
        id: lead.id,
        name: `${lead.First_Name || ""} ${lead.Last_Name || ""}`.trim() || "Unknown",
        company: lead.Company || "No Company",
        email: lead.Email || "",
        phone: lead.Phone || "",
        status: (lead.Lead_Status?.toLowerCase() === "qualified"
          ? "active"
          : lead.Lead_Status?.toLowerCase() === "closed"
            ? "completed"
            : "pending") as "pending" | "active" | "completed",
        activity: lead.Lead_Status || "New",
        createdAt: lead.Created_Time || new Date().toISOString(),
      }))
      transformedLeads.push(...transformedBatch)

      // Allow garbage collection between batches
      if (i % (batchSize * 2) === 0) {
        await new Promise((resolve) => setImmediate(resolve))
      }
    }

    console.log(`Transformed ${transformedLeads.length} leads using REST API`)

    const response = {
      success: true,
      leads: transformedLeads,
      hasMore: result.hasMore,
      currentPage: page,
      totalInBatch: transformedLeads.length,
      search: search || null,
    }

    // Cache the result
    setCachedData(cacheKey, response)

    console.log(`Records page: returning ${transformedLeads.length} leads using REST API`)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Simple leads fetch error:", error)

    // Clear cache on error
    cache.clear()

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
        message: error instanceof Error ? error.message : "Unknown error",
        leads: [],
        hasMore: false,
      },
      { status: 500 },
    )
  }
}

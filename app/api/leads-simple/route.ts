import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM, type ZohoLead, ACTIVITY_MAPPING } from "@/lib/zoho-crm"

interface TransformedLead {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  status: "pending" | "active" | "completed"
  activity?: string
  createdAt: string
}

function transformZohoLead(zohoLead: ZohoLead): TransformedLead {
  const firstName = zohoLead.First_Name || ""
  const lastName = zohoLead.Last_Name || ""
  const fullName = `${firstName} ${lastName}`.trim()

  let status: "pending" | "active" | "completed" = "pending"
  if (zohoLead.Lead_Status) {
    const leadStatus = zohoLead.Lead_Status.toLowerCase()
    if (leadStatus.includes("contacted") || leadStatus.includes("qualified")) {
      status = "active"
    } else if (leadStatus.includes("converted") || leadStatus.includes("closed")) {
      status = "completed"
    }
  }

  return {
    id: zohoLead.id,
    name: fullName || "Unknown",
    company: zohoLead.Company || "Unknown Company",
    email: zohoLead.Email || "",
    phone: zohoLead.Phone,
    status,
    activity: zohoLead.Activity,
    createdAt: zohoLead.Created_Time || new Date().toISOString(),
  }
}

function categorizeLeads(leads: TransformedLead[]): { [key: string]: TransformedLead[] } {
  const categorized: { [key: string]: TransformedLead[] } = {
    leads: [],
    questionnaire: [],
    quotation: [],
    "details-passed": [],
    "lost-cases": [],
    others: [],
  }

  leads.forEach((lead) => {
    const activity = lead.activity

    if (!activity) {
      categorized.others.push(lead)
      return
    }

    let categorizedFlag = false
    for (const [column, activities] of Object.entries(ACTIVITY_MAPPING)) {
      if (activities.includes(activity)) {
        categorized[column].push(lead)
        categorizedFlag = true
        break
      }
    }

    if (!categorizedFlag) {
      categorized.others.push(lead)
    }
  })

  return categorized
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10) // Reduced default
    const searchTerm = searchParams.get("search") || undefined
    const type = searchParams.get("type") || "kanban"

    console.log(
      `API: Simple leads fetch - page: ${page}, type: ${type}${searchTerm ? `, search: "${searchTerm}"` : ""}`,
    )

    // Validate environment variables
    if (!process.env.ZOHO_API_BASE_URL) {
      throw new Error("ZOHO_API_BASE_URL environment variable is not set")
    }
    if (!process.env.ZOHO_ACCESS_TOKEN && !process.env.ZOHO_REFRESH_TOKEN) {
      throw new Error("Neither ZOHO_ACCESS_TOKEN nor ZOHO_REFRESH_TOKEN is set")
    }

    let result: any
    let method: string

    // Use REST API search for search queries, regular REST API for loading
    if (searchTerm && searchTerm.trim()) {
      console.log(`Using REST API Search for: "${searchTerm}"`)
      method = "REST API Search"
      result = await zohoCRM.searchLeadsREST(searchTerm.trim(), page, Math.min(limit, 200))
    } else {
      console.log("Using REST API for regular loading")
      method = "REST API"
      result = await zohoCRM.getLeadsREST(page, limit)
    }

    const transformedLeads = result.data.map(transformZohoLead)
    console.log(`Transformed ${transformedLeads.length} leads using ${method}`)

    // Log first few leads for debugging search
    if (searchTerm && transformedLeads.length > 0) {
      console.log(
        `Search results sample for "${searchTerm}":`,
        transformedLeads.slice(0, 3).map((lead:any) => ({
          name: lead.name,
          email: lead.email,
          company: lead.company,
          phone: lead.phone,
        })),
      )
    }

    if (type === "kanban") {
      // For kanban board - categorize leads by activity
      const categorizedLeads = categorizeLeads(transformedLeads)

      // Log categorization results
      console.log(
        `Kanban categorization:`,
        Object.entries(categorizedLeads)
          .map(([key, leads]) => `${key}: ${leads.length}`)
          .join(", "),
      )

      return NextResponse.json({
        success: true,
        method,
        categorizedLeads,
        hasMore: result.hasMore,
        currentPage: page,
        totalInBatch: transformedLeads.length,
        searchTerm: searchTerm || null,
      })
    } else {
      // For records page - return flat list
      console.log(`Records page: returning ${transformedLeads.length} leads using ${method}`)

      return NextResponse.json({
        success: true,
        method,
        leads: transformedLeads,
        hasMore: result.hasMore,
        currentPage: page,
        totalInBatch: transformedLeads.length,
        searchTerm: searchTerm || null,
      })
    }
  } catch (error) {
    console.error("Simple leads fetch error:", error)
    const tokenStatus = zohoCRM.getTokenStatus()

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
        message: error instanceof Error ? error.message : "Unknown error",
        tokenStatus,
      },
      { status: 500 },
    )
  }
}

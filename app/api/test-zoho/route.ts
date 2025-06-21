import { NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET() {
  try {
    console.log("Testing Zoho CRM connection...")

    // Test basic connection
    const isConnected = await zohoCRM.testConnection()

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to Zoho CRM",
          details: "Both COQL and REST API connection tests failed",
          recommendation: "Check your access token and API base URL",
        },
        { status: 500 },
      )
    }

    // Try to get a small sample of leads
    try {
      const result = await zohoCRM.getLeadsWithPagination(1, 5)

      return NextResponse.json({
        success: true,
        message: "Zoho CRM connection successful",
        method: "COQL and/or REST API",
        sampleData: {
          totalLeads: result.totalCount,
          sampleLeads: result.data.length,
          firstLead: result.data[0] || null,
        },
        recommendation:
          result.totalCount > 1000
            ? "Consider re-authenticating with COQL scope for better performance with large datasets"
            : "Current setup is working well",
      })
    } catch (error) {
      return NextResponse.json({
        success: true,
        message: "Basic connection works, but data fetching failed",
        error: error instanceof Error ? error.message : "Unknown error",
        recommendation: "Check your OAuth scopes and permissions",
      })
    }
  } catch (error) {
    console.error("Zoho test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Zoho CRM test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        recommendation: "Verify your environment variables and OAuth setup",
      },
      { status: 500 },
    )
  }
}

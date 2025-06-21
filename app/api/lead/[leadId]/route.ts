import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json({ success: false, error: "Lead ID is required" }, { status: 400 })
    }

    console.log(`Fetching lead details for ID: ${leadId}`)

    const lead = await zohoCRM.getLeadById(leadId)

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      lead,
    })
  } catch (error) {
    console.error("Error fetching lead:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lead details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function POST(request: NextRequest) {
  try {
    const { leadId, currentActivity, newActivity, reason } = await request.json()

    if (!leadId || !newActivity) {
      return NextResponse.json({ success: false, error: "Lead ID and new activity are required" }, { status: 400 })
    }

    console.log(`Manual activity change: ${leadId} from "${currentActivity}" to "${newActivity}"`)

    // Get current lead details
    const lead = await zohoCRM.getLeadById(leadId)
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 })
    }

    // Update the lead activity
    const accessToken = await zohoCRM.getValidAccessToken()
    const url = `${process.env.ZOHO_API_BASE_URL}/Leads/${leadId}`

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            id: leadId,
            Activity: newActivity,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update activity: ${response.status} - ${errorText}`)
    }

    console.log(`Successfully changed activity for ${lead.name} from "${currentActivity}" to "${newActivity}"`)

    return NextResponse.json({
      success: true,
      message: `Activity updated successfully for ${lead.name}`,
      previousActivity: currentActivity,
      newActivity: newActivity,
      leadName: lead.name,
      reason: reason || "Manual activity change",
    })
  } catch (error) {
    console.error("Manual activity change error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to change activity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

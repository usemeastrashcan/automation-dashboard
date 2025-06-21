import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function POST(request: NextRequest) {
  try {
    const { leadId, newActivity, reason } = await request.json()

    if (!leadId || !newActivity) {
      return NextResponse.json({ success: false, error: "Lead ID and new activity are required" }, { status: 400 })
    }

    console.log(`Updating lead ${leadId} activity to: ${newActivity}`)

    // Get current lead details
    const lead = await zohoCRM.getLeadById(leadId)
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 })
    }

    // Update the lead activity using Zoho CRM
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
      console.error(`Failed to update lead activity: ${response.status} - ${errorText}`)
      throw new Error(`Failed to update lead activity: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log(`Successfully updated lead ${leadId} activity from "${lead.Activity}" to "${newActivity}"`)

    return NextResponse.json({
      success: true,
      message: `Lead activity updated successfully from "${lead.Activity || "None"}" to "${newActivity}"`,
      previousActivity: lead.Activity,
      newActivity: newActivity,
      leadName: lead.name,
      reason: reason || "Activity progression",
    })
  } catch (error) {
    console.error("Update lead activity error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update lead activity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

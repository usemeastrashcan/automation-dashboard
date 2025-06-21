import { type NextRequest, NextResponse } from "next/server"
import { getNextActivity, getActivityDescription, canProgressActivity } from "@/lib/activity-progression"

export async function POST(request: NextRequest) {
  try {
    const { currentActivity, leadId } = await request.json()

    if (!currentActivity) {
      return NextResponse.json({ success: false, error: "Current activity is required" }, { status: 400 })
    }

    console.log(`Getting next activity for: "${currentActivity}"`)

    // Check if the activity can be progressed
    if (!canProgressActivity(currentActivity)) {
      return NextResponse.json({
        success: false,
        message: `Activity "${currentActivity}" cannot be progressed further or is not in the standard workflow.`,
      })
    }

    // Get the next activity
    const nextActivity = getNextActivity(currentActivity)

    if (!nextActivity) {
      return NextResponse.json({
        success: false,
        message: `No next activity found for "${currentActivity}". This may be the final stage.`,
      })
    }

    // Get description of what the next activity means
    const description = getActivityDescription(nextActivity)

    console.log(`Next activity for "${currentActivity}" is "${nextActivity}"`)

    return NextResponse.json({
      success: true,
      currentActivity,
      nextActivity,
      description,
      message: `Next activity: ${nextActivity}`,
    })
  } catch (error) {
    console.error("Get next activity error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get next activity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

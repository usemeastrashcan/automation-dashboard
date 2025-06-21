import { type NextRequest, NextResponse } from "next/server"
import {
  getNextActionForActivity,
  getActionQuestionForActivity,
  getActivityDescription,
} from "@/lib/activity-progression"

export async function POST(request: NextRequest) {
  try {
    const { activity, leadId } = await request.json()

    if (!activity) {
      return NextResponse.json({ success: false, error: "Activity is required" }, { status: 400 })
    }

    console.log(`Getting next action for activity: "${activity}"`)

    // Get the recommended next action
    const nextAction = getNextActionForActivity(activity)
    const actionQuestion = getActionQuestionForActivity(activity)
    const description = getActivityDescription(activity)

    if (!nextAction || !actionQuestion) {
      return NextResponse.json({
        success: false,
        message: `No recommended action found for activity "${activity}".`,
      })
    }

    console.log(`Next action for "${activity}": ${nextAction}`)

    return NextResponse.json({
      success: true,
      activity,
      nextAction,
      actionQuestion,
      description,
      message: `Recommended action: ${nextAction}`,
    })
  } catch (error) {
    console.error("Get activity action error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get activity action",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

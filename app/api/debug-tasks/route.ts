import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get("ownerId") || process.env.DASHBOARD_USER_ID
    const limit = 5 // Just get a few tasks for debugging

    console.log(`DEBUG: Fetching tasks for debugging - Owner: ${ownerId}`)

    const result = await zohoCRM.getTasks({
      ownerId,
      status: "All", // Get all statuses for debugging
      dateRange: "All", // Get all dates for debugging
      priority: "All",
      page: 1,
      limit,
    })

    // Log the raw task data structure
    console.log("DEBUG: Raw task data structure:")
    result.data.forEach((task: any, index: number) => {
      console.log(`Task ${index + 1}:`, {
        id: task.id,
        subject: task.Subject,
        What_Id: task.What_Id,
        What_Id_type: typeof task.What_Id,
        Who_Id: task.Who_Id,
        Who_Id_type: typeof task.Who_Id,
        Owner: task.Owner,
      })
    })

    return NextResponse.json({
      success: true,
      debug: true,
      totalTasks: result.data.length,
      tasks: result.data.map((task: any) => ({
        id: task.id,
        subject: task.Subject,
        What_Id: task.What_Id,
        What_Id_type: typeof task.What_Id,
        What_Id_stringified: JSON.stringify(task.What_Id),
        Who_Id: task.Who_Id,
        Who_Id_type: typeof task.Who_Id,
        Owner: task.Owner,
      })),
    })
  } catch (error) {
    console.error("Debug tasks error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

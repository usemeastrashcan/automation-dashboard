import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get("ownerId") || process.env.DASHBOARD_USER_ID
    const status = searchParams.get("status") || "Open"
    const dateRange = searchParams.get("dateRange") || "today"
    const priority = searchParams.get("priority") || "All"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10)

    const result = await zohoCRM.getTasks({
      ownerId,
      status,
      dateRange,
      priority,
      page,
      limit,
    })

    // Transform tasks WITHOUT fetching lead details to avoid rate limits
    const transformedTasks = result.data.map((task: any) => {
      let relatedLeadId = null

      // Extract the actual ID from What_Id without making API calls
      if (task.What_Id) {
        if (typeof task.What_Id === "object" && task.What_Id.id) {
          relatedLeadId = task.What_Id.id
        } else if (typeof task.What_Id === "string") {
          relatedLeadId = task.What_Id
        }
      }

      return {
        id: task.id,
        subject: task.Subject || "No Subject",
        description: task.Description || "",
        dueDate: task.Due_Date || "",
        priority: task.Priority || "Medium",
        status: task.Status || "Open",
        owner: task.Owner
          ? {
              id: task.Owner.id,
              name: task.Owner.name,
            }
          : null,
        relatedLeadId: relatedLeadId, // Only store the ID
        relatedLead: null, // Don't fetch lead details here
        contactId: task.Who_Id || null,
        createdTime: task.Created_Time || "",
        modifiedTime: task.Modified_Time || "",
        closedTime: task.Closed_Time || null,
      }
    })

    return NextResponse.json({
      success: true,
      tasks: transformedTasks,
      hasMore: result.hasMore,
      currentPage: page,
      totalInBatch: transformedTasks.length,
      filters: {
        ownerId,
        status,
        dateRange,
        priority,
      },
    })
  } catch (error) {
    console.error("Tasks fetch error:", error)
    const tokenStatus = zohoCRM.getTokenStatus()

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tasks",
        message: error instanceof Error ? error.message : "Unknown error",
        tokenStatus,
      },
      { status: 500 },
    )
  }
}

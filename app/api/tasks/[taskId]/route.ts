import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params
    const { status } = await request.json()

    if (!taskId || !status) {
      return NextResponse.json({ success: false, error: "Task ID and status are required" }, { status: 400 })
    }

    console.log(`Updating task ${taskId} status to: ${status}`)

    await zohoCRM.updateTaskStatus(taskId, status)

    return NextResponse.json({
      success: true,
      message: `Task status updated to ${status}`,
      taskId,
      newStatus: status,
    })
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

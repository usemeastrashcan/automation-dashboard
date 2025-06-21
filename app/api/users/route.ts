import { NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET() {
  try {
    console.log("API: Fetching Zoho CRM users")

    const users = await zohoCRM.getUsers()

    const transformedUsers = users.map((user: any) => ({
      id: user.id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown",
      email: user.email || "",
      status: user.status || "Active",
      firstName: user.first_name || "",
      lastName: user.last_name || "",
    }))

    console.log(`Fetched ${transformedUsers.length} users`)

    return NextResponse.json({
      success: true,
      users: transformedUsers,
    })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { emailServiceMSAL } from "@/lib/email-service-msal"
import { microsoftAuthMSAL } from "@/lib/microsoft-auth-msal"

export async function POST(request: NextRequest) {
  try {
    if (!microsoftAuthMSAL.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Microsoft Graph API not configured",
          message: "Please configure Microsoft Graph API credentials first",
        },
        { status: 500 },
      )
    }

    if (!microsoftAuthMSAL.isAuthenticated()) {
      return NextResponse.json(
        {
          success: false,
          error: "Microsoft authentication required",
          message: "Please authenticate with Microsoft first by visiting /api/auth/microsoft",
        },
        { status: 401 },
      )
    }

    const { senderEmail, timeAfter, leadEmail } = await request.json()

    if (!senderEmail && !leadEmail) {
      return NextResponse.json(
        { success: false, error: "Either senderEmail or leadEmail is required" },
        { status: 400 },
      )
    }

    let parsedTimeAfter = timeAfter
    if (timeAfter) {
      parsedTimeAfter = emailServiceMSAL.parseTimeExpression(timeAfter)
    }

    const emails = await emailServiceMSAL.searchEmails({
      senderEmail: senderEmail || leadEmail,
      timeAfter: parsedTimeAfter,
    })

    const formattedEmails = emailServiceMSAL.formatEmailsForChat(emails)

    return NextResponse.json({
      success: true,
      emails,
      formattedEmails,
      count: emails.length,
      searchParams: {
        senderEmail: senderEmail || leadEmail,
        timeAfter: parsedTimeAfter,
        originalTimeExpression: timeAfter,
      },
    })
  } catch (error) {
    console.error("Email search error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

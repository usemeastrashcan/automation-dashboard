import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email-service"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function POST(request: NextRequest) {
  try {
    if (!microsoftAuth.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Microsoft Graph API not configured",
          message:
            "📧 Email search requires Microsoft Graph API setup. Please configure your Microsoft credentials first.",
          fallbackSuggestion: "I can help you with other lead management tasks instead.",
        },
        { status: 200 }, // Changed from 500 to 200 to avoid errors in chat
      )
    }

    if (!microsoftAuth.hasTokens()) {
      return NextResponse.json(
        {
          success: false,
          error: "Microsoft authentication required",
          message:
            "📧 Email search requires Microsoft authentication. Please authenticate first by visiting /api/auth/microsoft",
          fallbackSuggestion: "For now, I can help you with lead activity management and other CRM tasks.",
        },
        { status: 200 }, // Changed from 401 to 200 to avoid errors in chat
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
      parsedTimeAfter = emailService.parseTimeExpression(timeAfter)
    }

    const emails = await emailService.searchEmails({
      senderEmail: senderEmail || leadEmail,
      timeAfter: parsedTimeAfter,
    })

    const formattedEmails = emailService.formatEmailsForChat(emails)

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

    // Provide helpful fallback message instead of just error
    let fallbackMessage =
      "📧 Email search is temporarily unavailable. I can help you with other lead management tasks instead."

    if (error instanceof Error && error.message.includes("REAUTH_REQUIRED")) {
      fallbackMessage =
        "📧 Email authentication has expired. Please re-authenticate by visiting /api/auth/microsoft. For now, I can help you with other lead management tasks."
    }

    return NextResponse.json(
      {
        success: false,
        error: "Email search unavailable",
        message: fallbackMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }, // Return 200 so chat doesn't break
    )
  }
}

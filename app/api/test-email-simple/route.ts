import { NextResponse } from "next/server"
import { emailService } from "@/lib/email-service"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET() {
  try {
    console.log("🧪 Testing simplified email search...")

    const authStatus = microsoftAuth.getAuthStatus()
    console.log("🔍 Auth Status:", authStatus)

    if (!authStatus.configured) {
      return NextResponse.json({
        success: false,
        error: "Microsoft Graph API not configured",
        message: "Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file",
      })
    }

    if (!authStatus.hasTokens) {
      return NextResponse.json({
        success: false,
        error: "No authentication tokens found",
        message: "Please authenticate with Microsoft first",
        authUrl: "/api/auth/microsoft",
      })
    }

    try {
      console.log("🧪 Testing simplified email search...")

      // Test with a simple search - just get recent emails from a specific sender
      const testEmail = "rian.patel@vedaai.com" // Use the email from your test

      console.log(`📧 Searching for emails from: ${testEmail}`)
      const emails = await emailService.searchEmails({
        senderEmail: testEmail,
        // Don't include timeAfter for initial test to avoid complexity
      })

      console.log(`✅ Search successful: Found ${emails.length} emails`)

      // Test with time filter
      console.log("📧 Testing with time filter...")
      const recentEmails = await emailService.searchEmails({
        senderEmail: testEmail,
        timeAfter: "yesterday",
      })

      console.log(`✅ Time filter test successful: Found ${recentEmails.length} recent emails`)

      return NextResponse.json({
        success: true,
        message: `✅ Email search is working perfectly!`,
        tests: [
          {
            name: "Basic email search",
            email: testEmail,
            count: emails.length,
            status: "✅ Passed",
          },
          {
            name: "Time filtered search",
            email: testEmail,
            timeFilter: "yesterday",
            count: recentEmails.length,
            status: "✅ Passed",
          },
        ],
        sampleEmails: emails.slice(0, 2).map((email) => ({
          subject: email.subject,
          sender: email.sender.emailAddress.address,
          received: email.receivedDateTime,
          preview: email.bodyPreview.substring(0, 100) + "...",
        })),
        totalEmailsFound: emails.length,
        recentEmailsFound: recentEmails.length,
      })
    } catch (error) {
      console.error("❌ Email test failed:", error)

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "❌ Email search test failed",
        details: error instanceof Error ? error.stack : "No details available",
        suggestion: "Try re-authenticating at /api/auth/microsoft",
      })
    }
  } catch (error) {
    console.error("❌ Test email error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test email configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

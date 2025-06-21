import { NextResponse } from "next/server"
import { microsoftAuthMSAL } from "@/lib/microsoft-auth-msal"
import { emailServiceMSAL } from "@/lib/email-service-msal"

export async function GET() {
  try {
    console.log("🧪 Starting MSAL email test...")

    const sessionStatus = microsoftAuthMSAL.getSessionStatus()

    console.log("🔍 Session Status:", sessionStatus)

    let testResult = null

    if (!sessionStatus.isConfigured) {
      return NextResponse.json({
        success: false,
        error: "Microsoft Graph API not configured",
        message: "Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in your .env file",
        nextSteps: [
          "⚙️ Set up Microsoft Graph API credentials in your .env file",
          "📖 Visit /setup for detailed instructions",
        ],
      })
    }

    if (!sessionStatus.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: "No authentication session found",
        message: "Please authenticate with Microsoft first",
        nextSteps: ["🔐 Visit /api/auth/microsoft to authenticate"],
        autoActions: {
          canAutoAuth: true,
          authUrl: "/api/auth/microsoft",
        },
      })
    }

    try {
      console.log("🧪 Testing email search functionality using MSAL...")

      // Test 1: Simple search without filters
      console.log("📧 Test 1: Searching all recent emails...")
      const allEmails = await emailServiceMSAL.searchEmails({
        senderEmail: "test@example.com", // This will likely return 0 results, but tests the API
        timeAfter: "7 days ago",
      })
      console.log(`✅ Test 1 passed: API call successful (${allEmails.length} emails found)`)

      // Test 2: Search with time filter
      console.log("📧 Test 2: Searching emails since yesterday...")
      const recentEmails = await emailServiceMSAL.searchEmails({
        senderEmail: "test@example.com",
        timeAfter: "yesterday",
      })
      console.log(`✅ Test 2 passed: API call successful (${recentEmails.length} emails found)`)

      testResult = {
        success: true,
        message: `✅ Microsoft Graph API is working perfectly with MSAL!`,
        tests: [
          {
            name: "Email search API call",
            count: allEmails.length,
            status: "✅ Passed",
          },
          {
            name: "Time filter parsing",
            count: recentEmails.length,
            status: "✅ Passed",
          },
        ],
        note: "Tests use dummy email addresses, so 0 results is expected but indicates API is working",
        totalEmailsFound: allEmails.length,
      }
    } catch (error) {
      console.error("❌ Email test failed:", error)

      testResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "❌ Failed to connect to Microsoft Graph API using MSAL",
        details: error instanceof Error ? error.stack : "No details available",
      }
    }

    const nextSteps = testResult?.success
      ? ["✅ Email search is fully functional with MSAL!", "💬 You can now ask the chatbot to search for emails"]
      : ["🔄 Check the error details above", "🌐 Try re-authenticating at /api/auth/microsoft"]

    return NextResponse.json({
      sessionStatus,
      testResult,
      nextSteps,
      autoActions: {
        canAutoAuth: sessionStatus.isConfigured && !sessionStatus.isAuthenticated,
        authUrl: sessionStatus.isConfigured ? "/api/auth/microsoft" : null,
      },
    })
  } catch (error) {
    console.error("❌ Test email error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test email configuration",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      },
      { status: 500 },
    )
  }
}

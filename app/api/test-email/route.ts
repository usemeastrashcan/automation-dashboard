import { NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"
import { emailService } from "@/lib/email-service"

export async function GET() {
  try {
    console.log("🧪 Starting comprehensive email test...")

    // Force reload tokens from environment in case .env was updated
    microsoftAuth.forceReloadTokens()

    const authStatus = microsoftAuth.getAuthStatus()

    console.log("🔍 Auth Status:", {
      configured: authStatus.configured,
      hasTokens: authStatus.hasTokens,
      hasValidToken: authStatus.hasValidToken,
      tokenInfo: authStatus.tokenInfo,
    })

    let testResult = null

    if (!authStatus.configured) {
      return NextResponse.json({
        success: false,
        error: "Microsoft Graph API not configured",
        message: "Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file",
        nextSteps: [
          "⚙️ Set up Microsoft Graph API credentials in your .env file",
          "📖 Visit /setup for detailed instructions",
        ],
      })
    }

    if (!authStatus.hasTokens) {
      return NextResponse.json({
        success: false,
        error: "No authentication tokens found",
        message: "Please authenticate with Microsoft first",
        nextSteps: ["🔐 Visit /api/auth/microsoft to authenticate"],
        autoActions: {
          canAutoAuth: true,
          authUrl: "/api/auth/microsoft",
        },
      })
    }

    try {
      console.log("🧪 Testing email search functionality...")

      // Test 1: Get recent emails from inbox (without filtering by sender)
      console.log("📧 Test 1: Getting recent emails from inbox...")

      // Make direct call to get inbox emails to see what we have
      const accessToken = await microsoftAuth.getValidAccessToken()
      const url = new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages")
      url.searchParams.append("$select", "id,subject,sender,receivedDateTime,bodyPreview")
      url.searchParams.append("$top", "10")
      url.searchParams.append("$orderby", "receivedDateTime desc")

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status} - ${await response.text()}`)
      }

      const data = await response.json()
      const allEmails = data.value || []

      console.log(`✅ Test 1 passed: Found ${allEmails.length} total emails in inbox`)

      // Test 2: Search with a specific sender if we have emails
      let searchTestResult = null
      if (allEmails.length > 0) {
        // Use the first email's sender for testing
        const testSender = allEmails[0].sender?.emailAddress?.address
        if (testSender) {
          console.log(`📧 Test 2: Searching emails from ${testSender}...`)

          const searchEmails = await emailService.searchEmails({
            senderEmail: testSender,
            timeAfter: "last week",
          })

          searchTestResult = {
            testSender,
            count: searchEmails.length,
            status: "✅ Passed",
          }

          console.log(`✅ Test 2 passed: Found ${searchEmails.length} emails from ${testSender}`)
        }
      }

      // Show available senders for reference
      const availableSenders = [...new Set(allEmails.map((email: any) => email.sender?.emailAddress?.address))].filter(
        Boolean,
      )

      testResult = {
        success: true,
        message: `✅ Microsoft Graph API is working perfectly!`,
        tests: [
          {
            name: "Inbox access",
            count: allEmails.length,
            status: "✅ Passed",
          },
          searchTestResult || {
            name: "Email search",
            status: "⚠️ Skipped (no emails to test with)",
          },
        ],
        sampleEmails: allEmails.slice(0, 3).map((email: any) => ({
          subject: email.subject,
          sender: email.sender?.emailAddress?.address,
          senderName: email.sender?.emailAddress?.name,
          received: email.receivedDateTime,
        })),
        availableSenders: availableSenders.slice(0, 10),
        totalEmailsFound: allEmails.length,
        accountInfo: {
          user: "Roshaan Ali Mehar",
          email: "roshaanalimeh4r@outlook.com",
        },
      }
    } catch (error) {
      console.error("❌ Email test failed:", error)

      if (error instanceof Error && error.message.includes("REAUTH_REQUIRED")) {
        testResult = {
          success: false,
          error: "Re-authentication required",
          message: "🔐 Your authentication has expired. Please re-authenticate.",
          isReauthRequired: true,
        }
      } else {
        testResult = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          message: "❌ Failed to connect to Microsoft Graph API",
          details: error instanceof Error ? error.stack : "No details available",
        }
      }
    }

    const nextSteps = testResult?.success
      ? ["✅ Email search is fully functional!", "💬 You can now ask the chatbot to search for emails"]
      : testResult?.isReauthRequired
        ? ["🔐 Re-authenticate by visiting /api/auth/microsoft", "🔄 Try the test again after authentication"]
        : ["🔄 Check the error details above", "🌐 Try re-authenticating at /api/auth/microsoft"]

    return NextResponse.json({
      authStatus,
      testResult,
      nextSteps,
      autoActions: {
        canAutoAuth: authStatus.configured && (!authStatus.hasTokens || testResult?.isReauthRequired),
        authUrl: authStatus.configured ? "/api/auth/microsoft" : null,
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

import { NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET() {
  try {
    console.log("🔍 Debug: Testing email search with broader criteria...")

    const authStatus = microsoftAuth.getAuthStatus()
    if (!authStatus.configured || !authStatus.hasTokens) {
      return NextResponse.json({
        success: false,
        error: "Authentication not configured",
      })
    }

    // Get access token and make a direct call to see what emails we have
    const accessToken = await microsoftAuth.getValidAccessToken()

    // Get recent emails without any filtering
    const url = new URL("https://graph.microsoft.com/v1.0/me/messages")
    url.searchParams.append("$select", "id,subject,sender,receivedDateTime,bodyPreview")
    url.searchParams.append("$top", "10")
    url.searchParams.append("$orderby", "receivedDateTime desc")

    console.log(`🔍 Getting recent emails: ${url.toString()}`)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({
        success: false,
        error: `Graph API error: ${response.status} - ${error}`,
      })
    }

    const data = await response.json()
    const emails = data.value || []

    console.log(`✅ Found ${emails.length} recent emails`)

    // Show what email addresses we have
    const senderAddresses = emails.map((email: any) => ({
      sender: email.sender?.emailAddress?.address || "Unknown",
      senderName: email.sender?.emailAddress?.name || "Unknown",
      subject: email.subject,
      received: email.receivedDateTime,
    }))

    console.log("📧 Recent email senders:", senderAddresses)

    return NextResponse.json({
      success: true,
      message: `Found ${emails.length} recent emails`,
      recentEmails: senderAddresses,
      availableSenders: [...new Set(senderAddresses.map((e) => e.sender))],
      exchangeFormat: true,
      explanation:
        "Your emails are in Exchange Server format. The sender addresses are internal Exchange identifiers, not regular email addresses.",
      testSuggestions: [
        "This appears to be an Exchange Server environment",
        "The sender addresses are in internal Exchange format",
        "You may need to search by sender name instead of email address",
        "Consider checking the email headers for actual email addresses",
      ],
    })
  } catch (error) {
    console.error("❌ Debug test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

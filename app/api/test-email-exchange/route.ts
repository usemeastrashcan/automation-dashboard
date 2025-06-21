import { NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET() {
  try {
    console.log("🔍 Testing Exchange-compatible email search...")

    const authStatus = microsoftAuth.getAuthStatus()
    if (!authStatus.configured || !authStatus.hasTokens) {
      return NextResponse.json({
        success: false,
        error: "Authentication not configured",
      })
    }

    const accessToken = await microsoftAuth.getValidAccessToken()

    // Get recent emails with more details including sender name
    const url = new URL("https://graph.microsoft.com/v1.0/me/messages")
    url.searchParams.append("$select", "id,subject,sender,receivedDateTime,bodyPreview,from")
    url.searchParams.append("$top", "20")
    url.searchParams.append("$orderby", "receivedDateTime desc")

    console.log(`🔍 Getting recent emails with sender details: ${url.toString()}`)

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

    // Extract detailed sender information
    const emailDetails = emails.map((email: any) => ({
      subject: email.subject,
      senderAddress: email.sender?.emailAddress?.address || "Unknown",
      senderName: email.sender?.emailAddress?.name || "Unknown",
      fromAddress: email.from?.emailAddress?.address || "Unknown",
      fromName: email.from?.emailAddress?.name || "Unknown",
      received: email.receivedDateTime,
      preview: email.bodyPreview?.substring(0, 100) + "..." || "",
    }))

    // Look for patterns that might indicate external emails
    const externalEmails = emailDetails.filter(
      (email) =>
        email.senderAddress.includes("@") ||
        email.fromAddress.includes("@") ||
        !email.senderAddress.includes("/O=FIRST ORGANIZATION"),
    )

    return NextResponse.json({
      success: true,
      message: `Found ${emails.length} recent emails`,
      totalEmails: emails.length,
      externalEmails: externalEmails.length,
      emailDetails: emailDetails.slice(0, 10), // Show first 10
      externalEmailDetails: externalEmails.slice(0, 5), // Show first 5 external
      isExchangeEnvironment: emailDetails.some((email) => email.senderAddress.includes("/O=FIRST ORGANIZATION")),
      suggestions: [
        "This is an Exchange Server environment",
        "Most emails show internal Exchange addresses",
        `Found ${externalEmails.length} emails that might be from external senders`,
        "Try searching by sender name instead of email address",
      ],
    })
  } catch (error) {
    console.error("❌ Exchange test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

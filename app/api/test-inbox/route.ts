import { NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET() {
  try {
    console.log("🔍 Testing INBOX specifically...")

    const authStatus = microsoftAuth.getAuthStatus()
    if (!authStatus.configured || !authStatus.hasTokens) {
      return NextResponse.json({
        success: false,
        error: "Authentication not configured",
      })
    }

    const accessToken = await microsoftAuth.getValidAccessToken()

    // Test different endpoints to see what we get
    const endpoints = [
      {
        name: "Inbox Messages",
        url: "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
      },
      {
        name: "All Messages",
        url: "https://graph.microsoft.com/v1.0/me/messages",
      },
      {
        name: "Sent Items",
        url: "https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages",
      },
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint.url)
        url.searchParams.append("$select", "id,subject,sender,receivedDateTime,bodyPreview")
        url.searchParams.append("$top", "5")
        url.searchParams.append("$orderby", "receivedDateTime desc")

        console.log(`🔍 Testing ${endpoint.name}: ${url.toString()}`)

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const emails = data.value || []

          const emailSummary = emails.map((email: any) => ({
            subject: email.subject,
            sender: email.sender?.emailAddress?.address || "Unknown",
            senderName: email.sender?.emailAddress?.name || "Unknown",
            received: email.receivedDateTime,
          }))

          results.push({
            endpoint: endpoint.name,
            success: true,
            count: emails.length,
            emails: emailSummary,
          })

          console.log(`✅ ${endpoint.name}: Found ${emails.length} emails`)
        } else {
          const error = await response.text()
          results.push({
            endpoint: endpoint.name,
            success: false,
            error: `${response.status} - ${error}`,
          })
          console.log(`❌ ${endpoint.name}: ${response.status} - ${error}`)
        }
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tested different email endpoints",
      results,
      recommendation: "Check which endpoint shows the emails you're looking for",
    })
  } catch (error) {
    console.error("❌ Inbox test failed:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

import { microsoftAuth } from "./microsoft-auth"
import moment from "moment-timezone"

interface EmailSearchParams {
  senderEmail?: string
  timeAfter?: string
  leadEmail?: string
}

interface EmailResult {
  id: string
  subject: string
  sender: {
    emailAddress: {
      name: string
      address: string
    }
  }
  receivedDateTime: string
  bodyPreview: string
  hasAttachments: boolean
}

class EmailService {
  // Use inbox endpoint instead of general messages
  private readonly graphEndpoint = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"

  async searchEmails(params: EmailSearchParams): Promise<EmailResult[]> {
    try {
      console.log("🔍 Starting INBOX email search with params:", params)

      const accessToken = await microsoftAuth.getValidAccessToken()
      console.log("✅ Valid access token obtained")

      const senderEmail = params.senderEmail || params.leadEmail
      if (!senderEmail) {
        throw new Error("Sender email is required")
      }

      // Search in INBOX specifically for RECEIVED emails
      const url = new URL(this.graphEndpoint)

      // Try without complex filtering first - just get inbox emails
      url.searchParams.append("$select", "id,subject,sender,receivedDateTime,bodyPreview,hasAttachments")
      url.searchParams.append("$top", "100")
      url.searchParams.append("$orderby", "receivedDateTime desc")

      console.log(`🔍 Making Graph API request to INBOX: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`📡 Graph API response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Graph API error details:`, {
          status: response.status,
          statusText: response.statusText,
          error: error,
          url: url.toString(),
        })

        if (response.status === 401) {
          throw new Error(`Authentication failed. Token may be invalid or expired. Please re-authenticate.`)
        }

        throw new Error(`Graph API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      const emails = data.value || []

      console.log(`✅ Found ${emails.length} total emails in INBOX`)

      // Log sample emails to see what we're getting
      if (emails.length > 0) {
        console.log("📧 Sample inbox emails:")
        emails.slice(0, 3).forEach((email: EmailResult, index: number) => {
          console.log(`  ${index + 1}. From: ${email.sender?.emailAddress?.address} | Subject: ${email.subject}`)
        })
      }

      // Filter by sender email client-side (case-insensitive)
      const filteredEmails = emails.filter((email: EmailResult) => {
        const emailSender = email.sender?.emailAddress?.address?.toLowerCase()
        const targetSender = senderEmail.toLowerCase()
        return emailSender === targetSender
      })

      console.log(`📧 After sender filtering (${senderEmail}): ${filteredEmails.length} emails`)

      // Apply time filtering client-side if specified
      let finalEmails = filteredEmails
      if (params.timeAfter) {
        const parsedDateTime = this.parseTimeExpression(params.timeAfter)
        const filterDate = moment(parsedDateTime).toDate()

        console.log(`📅 Filtering emails after: ${filterDate.toISOString()}`)

        finalEmails = filteredEmails.filter((email: EmailResult) => {
          const emailDate = new Date(email.receivedDateTime)
          return emailDate >= filterDate
        })

        console.log(`📧 After time filtering: ${finalEmails.length} emails`)
      }

      // Log results for debugging
      if (finalEmails.length > 0) {
        console.log("✅ Found matching emails:")
        finalEmails.forEach((email:any, index:any) => {
          console.log(`  ${index + 1}. ${email.subject} (${email.receivedDateTime})`)
        })
      } else {
        console.log("❌ No matching emails found")
        console.log(`📧 Available senders in inbox:`)
        const uniqueSenders = [...new Set(emails.map((e: EmailResult) => e.sender?.emailAddress?.address))]
        uniqueSenders.slice(0, 10).forEach((sender, index) => {
          console.log(`  ${index + 1}. ${sender}`)
        })
      }

      return finalEmails
    } catch (error) {
      console.error("❌ Email search error:", error)

      if (error instanceof Error && error.message.includes("REAUTH_REQUIRED")) {
        throw new Error("Authentication required. Please re-authenticate by visiting /api/auth/microsoft")
      }

      throw error
    }
  }

  // Parse natural language time expressions
  parseTimeExpression(timeExpression: string): string {
    const now = moment()
    const expression = timeExpression.toLowerCase().trim()

    // Handle "X days ago" format
    const daysAgoMatch = expression.match(/(\d+)\s+days?\s+ago/)
    if (daysAgoMatch) {
      const days = Number.parseInt(daysAgoMatch[1])
      return now.clone().subtract(days, "days").format("YYYY-MM-DD HH:mm:ss")
    }

    // Handle "X weeks ago" format
    const weeksAgoMatch = expression.match(/(\d+)\s+weeks?\s+ago/)
    if (weeksAgoMatch) {
      const weeks = Number.parseInt(weeksAgoMatch[1])
      return now.clone().subtract(weeks, "weeks").format("YYYY-MM-DD HH:mm:ss")
    }

    // Handle "X hours ago" format
    const hoursAgoMatch = expression.match(/(\d+)\s+hours?\s+ago/)
    if (hoursAgoMatch) {
      const hours = Number.parseInt(hoursAgoMatch[1])
      return now.clone().subtract(hours, "hours").format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("last thursday")) {
      return now.clone().day(-3).format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("yesterday")) {
      return now.clone().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("last week")) {
      return now.clone().subtract(1, "week").format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("today")) {
      return now.clone().startOf("day").format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("this week")) {
      return now.clone().startOf("week").format("YYYY-MM-DD HH:mm:ss")
    }

    if (expression.includes("this month")) {
      return now.clone().startOf("month").format("YYYY-MM-DD HH:mm:ss")
    }

    // Try to parse as a specific date (YYYY-MM-DD format)
    const dateMatch = expression.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      const parsed = moment(dateMatch[1], "YYYY-MM-DD")
      if (parsed.isValid()) {
        return parsed.format("YYYY-MM-DD HH:mm:ss")
      }
    }

    // Try to parse as ISO date
    const parsed = moment(expression)
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD HH:mm:ss")
    }

    // Default to 7 days ago if nothing matches
    console.log(`⚠️ Could not parse time expression "${timeExpression}", defaulting to 7 days ago`)
    return now.clone().subtract(7, "days").format("YYYY-MM-DD HH:mm:ss")
  }

  // Format emails for display
  formatEmailsForChat(emails: EmailResult[]): string {
    if (emails.length === 0) {
      return "No emails found matching your criteria."
    }

    let result = `📧 Found ${emails.length} email(s):\n\n`

    emails.forEach((email, index) => {
      const receivedDate = moment(email.receivedDateTime).format("MMM DD, YYYY HH:mm")
      result += `**Email ${index + 1}:**\n`
      result += `From: ${email.sender.emailAddress.name} <${email.sender.emailAddress.address}>\n`
      result += `Subject: ${email.subject}\n`
      result += `Received: ${receivedDate}\n`
      result += `Preview: ${email.bodyPreview.substring(0, 150)}${email.bodyPreview.length > 150 ? "..." : ""}\n`
      if (email.hasAttachments) {
        result += `📎 Has attachments\n`
      }
      result += `\n---\n\n`
    })

    return result
  }
}

export const emailService = new EmailService()

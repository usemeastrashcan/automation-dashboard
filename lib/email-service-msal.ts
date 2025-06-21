import { microsoftAuthMSAL } from "./microsoft-auth-msal"
import { GRAPH_MAIL_ENDPOINT } from "./microsoft-auth-config"
import moment from "moment-timezone"
import axios from "axios"

interface EmailSearchParams {
  senderEmail?: string
  timeAfter?: string
  leadEmail?: string
}

interface EmailResult {
  subject: string
  sender: {
    emailAddress: {
      name: string
      address: string
    }
  }
  receivedDateTime: string
  bodyPreview: string
}

class EmailServiceMSAL {
  // Search emails using the exact same approach as your working code
  async searchEmails(params: EmailSearchParams): Promise<EmailResult[]> {
    try {
      console.log("🔍 Starting email search with params:", params)

      // Get access token using MSAL
      const accessToken = await microsoftAuthMSAL.getAccessToken()
      if (!accessToken) {
        throw new Error("Could not retrieve access token. Please re-authenticate.")
      }

      const senderEmail = params.senderEmail || params.leadEmail
      if (!senderEmail || !params.timeAfter) {
        throw new Error("Request must contain senderEmail and timeAfter.")
      }

      // Parse time exactly like your working code
      const utcDateTime = moment.tz(params.timeAfter, moment.tz.guess()).utc().format("YYYY-MM-DDTHH:mm:ss[Z]")
      console.log(`📅 Parsed time "${params.timeAfter}" to UTC: ${utcDateTime}`)

      // Build filter query exactly like your working code
      const filterQuery = `sender/emailAddress/address eq '${senderEmail}' and receivedDateTime ge ${utcDateTime}`

      const url = new URL(GRAPH_MAIL_ENDPOINT)
      url.searchParams.append("$filter", filterQuery)
      url.searchParams.append("$select", "subject,sender,receivedDateTime,bodyPreview")
      url.searchParams.append("$top", "100")

      console.log("🔍 Making Graph API request to:", url.toString())
      console.log("🔍 Filter:", filterQuery)

      // Make request exactly like your working code
      const graphResponse = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log(`✅ Found ${graphResponse.data.value?.length || 0} emails`)

      // Return the value array exactly like your working code
      return graphResponse.data.value || []
    } catch (error) {
      // Error logging exactly like your working code
      console.error("--- Error Calling Graph API ---")
      if (axios.isAxiosError(error) && error.response) {
        console.error("Status:", error.response.status)
        console.error("Data:", JSON.stringify(error.response.data, null, 2))
      } else {
        console.error("Error Message:", error instanceof Error ? error.message : "Unknown error")
      }
      console.error("--- End of Error Details ---")

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
      result += `\n---\n\n`
    })

    return result
  }
}

export const emailServiceMSAL = new EmailServiceMSAL()

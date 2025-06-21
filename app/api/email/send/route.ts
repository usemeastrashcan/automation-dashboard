import { NextResponse } from "next/server"
import { ensureAuthenticated } from "@/lib/auth-middleware"
import { updateLeadField } from "@/lib/lead-manager"
import { EmailTemplateGenerator } from "@/lib/email-templates"

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_EMAIL_WEBHOOK_URL

export async function POST(request: Request) {
  // Check authentication
  const authError = await ensureAuthenticated()
  if (authError) return authError

  try {
    const { to, subject, body, leadId, emailType, recipientName, companyName } = await request.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Email recipient, subject, and body are required" }, { status: 400 })
    }

    console.log(`📧 Sending ${emailType || "general"} email to ${to}`)

    // Generate properly formatted HTML email
    const emailData = {
      recipientName: recipientName || to.split("@")[0],
      senderName: "Forbes Burton Team",
      companyName: companyName || "Your Business",
      content: body,
      emailType: emailType || "general",
      contactInfo: {
        email: "contact@forbesburton.com",
        phone: "+1 (555) 123-4567",
      },
    }

    const { subject: formattedSubject, htmlBody } = EmailTemplateGenerator.generateEmailFromType(
      emailType || "general",
      emailData,
    )

    // Send email via Zapier webhook if configured
    if (ZAPIER_WEBHOOK_URL) {
      try {
        // Create clean plain text version
        const plainTextBody = body
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<p[^>]*>/gi, "")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\n\s*\n\s*\n/g, "\n\n")
          .trim()

        // FIXED: Send email in the correct format for Zapier/Gmail
        const zapierPayload = {
          to,
          subject: formattedSubject,
          // Use 'message' field for HTML content (common Zapier field)
          message: htmlBody,
          // Also include alternative field names
          body_html: htmlBody,
          html_body: htmlBody,
          content: htmlBody,
          // Plain text fallback
          text_body: plainTextBody,
          body_text: plainTextBody,
          // Metadata
          leadId,
          emailType: emailType || "general",
          // Email format specification
          format: "html",
          content_type: "text/html",
          is_html: true,
        }

        console.log("📧 Sending HTML email via Zapier:")
        console.log("  To:", to)
        console.log("  Subject:", formattedSubject)
        console.log("  Format: HTML")
        console.log("  HTML Body Length:", htmlBody.length)

        const zapierResponse = await fetch(ZAPIER_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(zapierPayload),
        })

        if (!zapierResponse.ok) {
          const errorText = await zapierResponse.text()
          console.error("❌ Zapier webhook failed:", errorText)
          throw new Error(`Zapier webhook failed: ${zapierResponse.status} - ${errorText}`)
        }

        const zapierResult = await zapierResponse.json().catch(() => ({}))
        console.log("✅ Zapier response received")

        console.log(`✅ HTML Email sent successfully to ${to} via Zapier`)
      } catch (zapierError) {
        console.error("❌ Failed to send via Zapier:", zapierError)
        return NextResponse.json({ error: "Failed to send email via Zapier" }, { status: 500 })
      }
    } else {
      // For development/testing
      console.log(`📧 Email Content (MOCK - No Zapier configured):
To: ${to}
Subject: ${formattedSubject}
Type: ${emailType || "general"}
Format: HTML

=== HTML CONTENT ===
${htmlBody.substring(0, 500)}...
==================`)
    }

    // Update lead fields based on email type if leadId is provided
    if (leadId && emailType) {
      const currentDate = new Date().toISOString().split("T")[0]
      let updateField = ""
      const updateValue = currentDate

      if (emailType === "questionnaire") {
        updateField = "Questionnaire_Date_Sent"
      } else if (emailType === "quotation") {
        updateField = "Informal_Quote_Sent"
      }

      if (updateField) {
        try {
          await updateLeadField(leadId, updateField, updateValue)
          console.log(`✅ Updated lead ${leadId} field ${updateField} to ${updateValue}`)
        } catch (error) {
          console.error(`❌ Failed to update lead field:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `HTML email sent successfully to ${to}`,
      emailType: emailType || "general",
      subject: formattedSubject,
      dateSent: new Date().toISOString(),
      format: "html",
    })
  } catch (error) {
    console.error("❌ Error sending email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

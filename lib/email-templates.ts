interface EmailTemplateData {
  recipientName: string
  senderName: string
  companyName: string
  content: string
  emailType: string
  contactInfo?: {
    phone?: string
    email?: string
  }
}

export class EmailTemplateGenerator {
  private static getBaseTemplate(content: string, emailType: string): string {
    const typeColors = {
      questionnaire: "#3B82F6", // Blue
      quotation: "#10B981", // Green
      "follow-up": "#F59E0B", // Orange
      general: "#6B7280", // Gray
    }

    const typeIcons = {
      questionnaire: "📋",
      quotation: "💰",
      "follow-up": "🔄",
      general: "📧",
    }

    const color = typeColors[emailType as keyof typeof typeColors] || typeColors.general
    const icon = typeIcons[emailType as keyof typeof typeIcons] || typeIcons.general

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email from Forbes Burton</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .email-header {
            background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .email-type-badge {
            display: inline-block;
            background-color: rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .email-body {
            padding: 32px;
        }
        .email-content {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 24px;
        }
        .email-content p {
            margin-bottom: 16px;
        }
        .email-content strong {
            color: ${color};
            font-weight: 600;
        }
        .email-content ul {
            padding-left: 20px;
            margin-bottom: 16px;
        }
        .email-content li {
            margin-bottom: 8px;
        }
        .signature {
            border-top: 2px solid #e5e7eb;
            padding-top: 24px;
            margin-top: 32px;
        }
        .signature-name {
            font-weight: 600;
            font-size: 18px;
            color: ${color};
            margin-bottom: 4px;
        }
        .signature-title {
            color: #6b7280;
            margin-bottom: 12px;
        }
        .contact-info {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 12px;
        }
        .contact-item {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #6b7280;
            font-size: 14px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .email-body { padding: 20px; }
            .contact-info { flex-direction: column; gap: 8px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        
        <div class="email-body">
            <div class="email-content">
                ${content}
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">This email was sent from Forbes Burton CRM System</p>
        </div>
    </div>
</body>
</html>`
  }

  static generateQuestionnaireEmail(data: EmailTemplateData): { subject: string; htmlBody: string } {
    const content = this.formatContent(data.content)

    const subject = `📋 Business Questionnaire - ${data.companyName || "Your Business Growth"}`

    const htmlBody = this.getBaseTemplate(content, "questionnaire")

    return { subject, htmlBody }
  }

  static generateQuotationEmail(data: EmailTemplateData): { subject: string; htmlBody: string } {
    const content = this.formatContent(data.content)

    const subject = `💰 Your Business Growth Quote - ${data.companyName || "Tailored Solutions"}`

    const htmlBody = this.getBaseTemplate(content, "quotation")

    return { subject, htmlBody }
  }

  static generateFollowUpEmail(data: EmailTemplateData): { subject: string; htmlBody: string } {
    const content = this.formatContent(data.content)

    const subject = `🔄 Following Up - ${data.companyName || "Your Business Growth Journey"}`

    const htmlBody = this.getBaseTemplate(content, "follow-up")

    return { subject, htmlBody }
  }

  static generateGeneralEmail(data: EmailTemplateData): { subject: string; htmlBody: string } {
    const content = this.formatContent(data.content)

    const subject = `📧 Message from Forbes Burton - ${data.companyName || "Business Growth Solutions"}`

    const htmlBody = this.getBaseTemplate(content, "general")

    return { subject, htmlBody }
  }

  private static formatContent(content: string): string {
    // Convert plain text to HTML with proper formatting
    const formattedContent = content
      // Convert double line breaks to paragraph breaks
      .split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => {
        // Handle bullet points
        if (paragraph.includes("- ")) {
          const items = paragraph.split("- ").filter((item) => item.trim().length > 0)
          if (items.length > 1) {
            const listItems = items
              .slice(1)
              .map((item) => `<li>${this.formatInlineText(item.trim())}</li>`)
              .join("")
            return `<p>${this.formatInlineText(items[0])}</p><ul>${listItems}</ul>`
          }
        }

        // Regular paragraph
        return `<p>${this.formatInlineText(paragraph)}</p>`
      })
      .join("")

    return formattedContent
  }

  private static formatInlineText(text: string): string {
    return (
      text
        // Bold text with **text** or **text:**
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // Quoted text with "text"
        .replace(/"([^"]+)"/g, '<strong>"$1"</strong>')
        // Email addresses
        .replace(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
          '<a href="mailto:$1" style="color: #3B82F6;">$1</a>',
        )
        // Phone numbers (basic pattern)
        .replace(/(\+?[\d\s\-$$$$]{10,})/g, '<a href="tel:$1" style="color: #3B82F6;">$1</a>')
        // Single line breaks to <br>
        .replace(/\n/g, "<br>")
    )
  }

  static generateEmailFromType(emailType: string, data: EmailTemplateData): { subject: string; htmlBody: string } {
    switch (emailType.toLowerCase()) {
      case "questionnaire":
        return this.generateQuestionnaireEmail(data)
      case "quotation":
        return this.generateQuotationEmail(data)
      case "follow-up":
        return this.generateFollowUpEmail(data)
      default:
        return this.generateGeneralEmail(data)
    }
  }
}

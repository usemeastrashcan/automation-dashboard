"use client"
import { TemplateEmailComposer } from "./template-email-composer"
import { FileText, Download, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EmailDraft {
  to: string
  subject: string
  body: string
  emailType: string
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  Activity?: string
}

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

interface DocumentSummary {
  fileName: string
  fileType: string
  keyPoints: string[]
  summary: string
}

interface InteractiveContentRendererProps {
  content: string
  onEmailSend?: (emailData: EmailDraft) => Promise<void>
  onSaveAsPrompt?: (prompt: string) => void
  leadId?: string
  leadData?: Lead
  attachments?: FileAttachment[]
}

export function InteractiveContentRenderer({
  content,
  onEmailSend,
  onSaveAsPrompt,
  leadId,
  leadData,
  attachments,
}: InteractiveContentRendererProps) {
  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Get file type icon and color
  const getFileTypeInfo = (type: string, name: string) => {
    const extension = name.split(".").pop()?.toLowerCase()

    if (type.includes("pdf") || extension === "pdf") {
      return { icon: FileText, color: "text-red-600", bgColor: "bg-red-50", label: "PDF" }
    } else if (type.includes("word") || ["doc", "docx"].includes(extension || "")) {
      return { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50", label: "Word" }
    } else if (type.includes("text") || ["txt", "md"].includes(extension || "")) {
      return { icon: FileText, color: "text-gray-600", bgColor: "bg-gray-50", label: "Text" }
    } else if (type.includes("csv") || extension === "csv") {
      return { icon: FileText, color: "text-green-600", bgColor: "bg-green-50", label: "CSV" }
    }

    return { icon: FileText, color: "text-gray-600", bgColor: "bg-gray-50", label: "File" }
  }

  const parseInteractiveContent = (text: string) => {
    const parts = []
    let currentIndex = 0

    // Only look for email generation requests - no more AI email parsing
    const emailRequestPatterns = [
      /(?:generate|create|compose|draft|send|write).*?(?:email|message)/gi,
      /(?:email|message).*?(?:generate|create|compose|draft|send|write)/gi,
      /(?:use|select|choose|pick).*?(?:template|email template)/gi,
    ]

    let foundEmailRequest = false

    for (const pattern of emailRequestPatterns) {
      pattern.lastIndex = 0
      const match = pattern.exec(text)

      if (match) {
        // Add text before the email request
        if (match.index > currentIndex) {
          const beforeText = text.slice(currentIndex, match.index)
          if (beforeText.trim()) {
            parts.push({
              type: "text",
              content: beforeText,
            })
          }
        }

        // Add email composer
        parts.push({
          type: "email_composer",
          content: match[0],
        })

        foundEmailRequest = true
        currentIndex = match.index + match[0].length
        break
      }
    }

    // Document analysis patterns (keep existing)
    if (!foundEmailRequest) {
      const documentPatterns = [
        {
          name: "document_summary",
          pattern:
            /(?:Document Analysis|File Analysis|Summary of uploaded (?:document|file))[\s\S]*?(?=\n\n(?:Would you like|Let me know|Is this|Does this|Here's|$)|$)/gi,
          type: "document_analysis",
        },
        {
          name: "document_insights",
          pattern:
            /(?:Key (?:insights|findings|points)|Important information|Based on the (?:document|file))[\s\S]*?(?=\n\n(?:Would you like|Let me know|Is this|Does this|Here's|$)|$)/gi,
          type: "document_insights",
        },
      ]

      for (const patternObj of documentPatterns) {
        patternObj.pattern.lastIndex = 0
        let match

        while ((match = patternObj.pattern.exec(text)) !== null) {
          if (match.index > currentIndex) {
            const beforeText = text.slice(currentIndex, match.index)
            if (beforeText.trim()) {
              parts.push({
                type: "text",
                content: beforeText,
              })
            }
          }

          const documentContent = match[0]
          const documentSummary = parseDocumentContent(documentContent)

          if (documentSummary) {
            parts.push({
              type: "document_summary",
              content: documentSummary,
            })
            currentIndex = match.index + match[0].length
            foundEmailRequest = true
            break
          }
        }

        if (foundEmailRequest) break
      }
    }

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex)
      if (remainingText.trim()) {
        parts.push({
          type: "text",
          content: remainingText,
        })
      }
    }

    return parts.length > 0 ? parts : [{ type: "text", content: text }]
  }

  const parseDocumentContent = (documentText: string): DocumentSummary | null => {
    try {
      // Extract key information from document analysis text
      const lines = documentText.split("\n").filter((line) => line.trim())

      // Try to identify file name from attachments or content
      let fileName = "Uploaded Document"
      let fileType = "Document"

      if (attachments && attachments.length > 0) {
        fileName = attachments[0].name
        fileType = getFileTypeInfo(attachments[0].type, attachments[0].name).label
      }

      // Extract key points (lines that start with bullet points, numbers, or dashes)
      const keyPoints = lines
        .filter((line) => /^[\s]*[-•*\d+.]\s/.test(line))
        .map((line) => line.replace(/^[\s]*[-•*\d+.]\s*/, "").trim())
        .slice(0, 5) // Limit to 5 key points

      // Create summary from the first few sentences
      const sentences = documentText.split(/[.!?]+/).filter((s) => s.trim().length > 10)
      const summary = sentences.slice(0, 2).join(". ").trim() + (sentences.length > 2 ? "." : "")

      return {
        fileName,
        fileType,
        keyPoints: keyPoints.length > 0 ? keyPoints : ["Document analysis completed"],
        summary: summary || "Document has been analyzed and processed.",
      }
    } catch (error) {
      console.error("Error parsing document content:", error)
      return null
    }
  }

  const handleEmailSend = async (emailData: EmailDraft) => {
    if (onEmailSend) {
      await onEmailSend(emailData)
    }
  }

  const handleTemplateEmailSend = async (emailData: {
    to: string
    subject: string
    body: string
    templateId?: string
    templateName?: string
  }) => {
    if (onEmailSend) {
      await onEmailSend({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        emailType: "template", // Mark as template email
      })
    }
  }

  const handleSaveAsPrompt = (prompt: string) => {
    if (onSaveAsPrompt) {
      onSaveAsPrompt(prompt)
    }
  }

  const parts = parseInteractiveContent(content)
  console.log(
    "📧 Content parts:",
    parts.map((p) => ({
      type: p.type,
      hasEmail: p.type === "email",
      hasDocument: p.type === "document_summary",
      hasEmailComposer: p.type === "email_composer",
    })),
  )

  return (
    <div className="space-y-4">
      {/* Render file attachments if present */}
      {attachments && attachments.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {attachments.length === 1 ? "Attached Document" : `${attachments.length} Attached Documents`}
              </span>
            </div>
            <div className="space-y-2">
              {attachments.map((file, index) => {
                const fileInfo = getFileTypeInfo(file.type, file.name)
                const IconComponent = fileInfo.icon

                return (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${fileInfo.bgColor}`}>
                    <IconComponent className={`w-5 h-5 ${fileInfo.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {fileInfo.label}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    {file.url && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render parsed content parts */}
      {parts.map((part, index) => {
        if (part.type === "email_composer" && onEmailSend) {
          return (
            <TemplateEmailComposer key={index} leadData={leadData} onSend={handleTemplateEmailSend} className="my-4" />
          )
        }

        if (part.type === "document_summary") {
          const summary = part.content as DocumentSummary
          return (
            <Card key={index} className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Document Analysis</span>
                  <Badge variant="outline" className="text-xs">
                    {summary.fileType}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{summary.fileName}</h4>
                    <p className="text-sm text-gray-600">{summary.summary}</p>
                  </div>

                  {summary.keyPoints.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Key Points:</h5>
                      <ul className="space-y-1">
                        {summary.keyPoints.map((point, pointIndex) => (
                          <li key={pointIndex} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        }

        return (
          <div key={index} className="whitespace-pre-wrap text-sm">
            {typeof part.content === "string" ? part.content : JSON.stringify(part.content)}
          </div>
        )
      })}
    </div>
  )
}

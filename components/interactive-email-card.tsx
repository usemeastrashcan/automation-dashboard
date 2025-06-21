"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Edit3, Send, Copy, Check, X } from "lucide-react"

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

interface InteractiveEmailCardProps {
  emailDraft: EmailDraft
  onSend: (emailData: EmailDraft) => Promise<void>
  onSaveAsPrompt?: (prompt: string) => void
  leadId?: string
  leadData?: Lead
  className?: string
}

export function InteractiveEmailCard({
  emailDraft,
  onSend,
  onSaveAsPrompt,
  leadId,
  leadData,
  className = "",
}: InteractiveEmailCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<EmailDraft>({
    ...emailDraft,
    to: leadData?.email || emailDraft.to || "recipient@example.com",
  })

  // Update currentEmail when emailDraft changes (for subsequent renders)
  useEffect(() => {
    console.log("📧 Email card updated with new draft:", {
      originalTo: emailDraft.to,
      leadEmail: leadData?.email,
      finalTo: leadData?.email || emailDraft.to,
      bodyLength: emailDraft.body.length,
      subject: emailDraft.subject.substring(0, 50) + "...",
    })

    setCurrentEmail({
      ...emailDraft,
      to: leadData?.email || emailDraft.to || "recipient@example.com",
    })
  }, [emailDraft, leadData])

  const getEmailTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "questionnaire":
        return "bg-blue-50 border-blue-200"
      case "quotation":
        return "bg-green-50 border-green-200"
      case "follow-up":
        return "bg-orange-50 border-orange-200"
      case "marketing":
        return "bg-purple-50 border-purple-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getEmailTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "questionnaire":
        return "📋"
      case "quotation":
        return "💰"
      case "follow-up":
        return "🔄"
      case "marketing":
        return "📢"
      default:
        return "📧"
    }
  }

  const handleEdit = () => {
    console.log("✏️ Starting edit mode with:", {
      to: currentEmail.to,
      subject: currentEmail.subject,
      bodyLength: currentEmail.body.length,
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    console.log("💾 Saving changes:", {
      to: currentEmail.to,
      subject: currentEmail.subject,
      bodyLength: currentEmail.body.length,
    })

    setIsEditing(false)

    if (onSaveAsPrompt) {
      const promptString = `I've edited the email draft. Here's the updated version:

**Email Details:**
To: ${currentEmail.to}
Subject: ${currentEmail.subject}
Type: ${currentEmail.emailType}

**Email Content:**
${currentEmail.body}

Please review this updated email draft. Would you like me to make any further changes, or shall I proceed with sending it?`

      onSaveAsPrompt(promptString)
    }
  }

  const handleCancel = () => {
    console.log("❌ Cancelling edit")
    setIsEditing(false)
    setCurrentEmail({
      ...emailDraft,
      to: leadData?.email || emailDraft.to || "recipient@example.com",
    })
  }

  const handleSend = async () => {
    console.log("📤 Sending email:", {
      to: currentEmail.to,
      subject: currentEmail.subject,
      bodyLength: currentEmail.body.length,
    })

    setIsSending(true)
    try {
      await onSend(currentEmail)
    } finally {
      setIsSending(false)
    }
  }

  const handleCopy = async () => {
    const emailText = `To: ${currentEmail.to}\nSubject: ${currentEmail.subject}\n\n${currentEmail.body}`
    await navigator.clipboard.writeText(emailText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div
      className={`relative transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={`${getEmailTypeColor(currentEmail.emailType)} transition-all duration-300 ${
          isHovered ? "shadow-xl scale-[1.02] ring-2 ring-blue-200" : "shadow-md"
        }`}
      >
        {/* Email Type Header */}
        <div className="px-4 py-2 border-b bg-white/50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getEmailTypeIcon(currentEmail.emailType)}</span>
              <span className="text-sm font-medium text-gray-700 capitalize">{currentEmail.emailType} Email Draft</span>
              {leadData && <span className="text-xs text-gray-500">for {leadData.name}</span>}
            </div>

            {/* Hover Actions */}
            <div
              className={`flex items-center gap-2 transition-all duration-200 ${
                isHovered || isEditing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
              }`}
            >
              {!isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title="Copy email content"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEdit}
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                    title="Edit email"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </>
              )}

              {isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    className="h-8 w-8 p-0 hover:bg-green-100"
                    title="Save changes"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Email Fields */}
          <div className="space-y-3">
            {/* To Field */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
              {isEditing ? (
                <Input
                  value={currentEmail.to}
                  onChange={(e) => setCurrentEmail((prev) => ({ ...prev, to: e.target.value }))}
                  className="mt-1"
                  placeholder="Recipient email"
                />
              ) : (
                <div className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-2">
                  {currentEmail.to}
                  {leadData && currentEmail.to === leadData.email && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Lead Email</span>
                  )}
                </div>
              )}
            </div>

            {/* Subject Field */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
              {isEditing ? (
                <Input
                  value={currentEmail.subject}
                  onChange={(e) => setCurrentEmail((prev) => ({ ...prev, subject: e.target.value }))}
                  className="mt-1"
                  placeholder="Email subject"
                />
              ) : (
                <div className="mt-1 text-sm font-medium text-gray-900">{currentEmail.subject}</div>
              )}
            </div>

            {/* Body Field */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
              {isEditing ? (
                <Textarea
                  value={currentEmail.body}
                  onChange={(e) => setCurrentEmail((prev) => ({ ...prev, body: e.target.value }))}
                  className="mt-1 min-h-[300px] resize-y"
                  placeholder="Email content"
                />
              ) : (
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border max-h-[400px] overflow-y-auto">
                  {currentEmail.body}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className={`flex items-center justify-between pt-3 border-t transition-all duration-200 ${
              isHovered || isEditing ? "opacity-100" : "opacity-60"
            }`}
          >
            <div className="text-xs text-gray-500">
              {isEditing ? "Editing email draft" : "Ready to send"}
              {currentEmail.body && <span className="ml-2">({currentEmail.body.length} characters)</span>}
            </div>

            <div className="flex items-center gap-2">
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </Button>
              )}

              {isEditing && (
                <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Save Changes
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

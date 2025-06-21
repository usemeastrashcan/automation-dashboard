"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Mail, LayoutTemplateIcon as Template, Send, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  folder: string
  module: string
}

interface TemplateSearchResult {
  id: string
  name: string
  subject: string
  folder: string
  module: string
}

interface TemplateEmailComposerProps {
  initialTo?: string
  leadData?: {
    id: string
    name: string
    company: string
    email: string
    phone?: string
  }
  onSend?: (emailData: {
    to: string
    subject: string
    body: string
    templateId?: string
    templateName?: string
  }) => Promise<void>
  onCancel?: () => void
  className?: string
}

export function TemplateEmailComposer({
  initialTo = "",
  leadData,
  onSend,
  onCancel,
  className,
}: TemplateEmailComposerProps) {
  const [to, setTo] = useState(initialTo || leadData?.email || "")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  // Template search states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TemplateSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Email states
  const [sending, setSending] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // Search templates with debounce
  useEffect(() => {
    const searchTemplates = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setSearchLoading(true)
      try {
        const response = await fetch(`/api/zoho/email-templates?limit=20`)
        if (response.ok) {
          const data = await response.json()
          const templates = data.data || []

          // Filter templates based on search query
          const filtered = templates.filter(
            (template: TemplateSearchResult) =>
              template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
              template.folder.toLowerCase().includes(searchQuery.toLowerCase()),
          )

          setSearchResults(filtered.slice(0, 10)) // Limit to 10 results
          setShowDropdown(filtered.length > 0)
        }
      } catch (error) {
        console.error("Template search error:", error)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchTemplates, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load template content
  const loadTemplate = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch(`/api/zoho/email-template/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        const template = data.template

        setSelectedTemplate({
          id: template.id,
          name: template.name,
          subject: template.subject,
          content: template.content,
          folder: template.folder?.name || "Unknown",
          module: template.module?.api_name || template.module || "Unknown",
        })

        setSubject(template.subject || "")
        setContent(template.content || "")
        setSearchQuery(templateName)
        setShowDropdown(false)
      }
    } catch (error) {
      console.error("Error loading template:", error)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (template: TemplateSearchResult) => {
    loadTemplate(template.id, template.name)
  }

  // Handle send email
  const handleSend = async () => {
    if (!to || !subject || !content) {
      alert("Please fill in all required fields")
      return
    }

    setSending(true)
    try {
      if (onSend) {
        await onSend({
          to,
          subject,
          body: content,
          templateId: selectedTemplate?.id,
          templateName: selectedTemplate?.name,
        })
      }
    } catch (error) {
      console.error("Error sending email:", error)
      alert("Failed to send email. Please try again.")
    } finally {
      setSending(false)
    }
  }

  // Convert HTML to clean, editable text
  const htmlToText = (html: string): string => {
    // Create a temporary div to parse HTML
    const div = document.createElement("div")
    div.innerHTML = html

    // Replace common HTML elements with readable text
    let text = div.innerHTML

    // Replace paragraph tags with double line breaks
    text = text.replace(/<\/p>/gi, "\n\n")
    text = text.replace(/<p[^>]*>/gi, "")

    // Replace br tags with single line breaks
    text = text.replace(/<br\s*\/?>/gi, "\n")

    // Replace list items with bullet points
    text = text.replace(/<li[^>]*>/gi, "• ")
    text = text.replace(/<\/li>/gi, "\n")

    // Remove other HTML tags
    text = text.replace(/<[^>]*>/g, "")

    // Decode HTML entities
    const textarea = document.createElement("textarea")
    textarea.innerHTML = text
    text = textarea.value

    // Clean up extra whitespace
    text = text.replace(/\n{3,}/g, "\n\n")
    text = text.replace(/^\s+|\s+$/g, "")

    return text
  }

  // Convert text back to HTML
  const textToHtml = (text: string): string => {
    return text
      .split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => {
        // Handle bullet points
        if (paragraph.startsWith("• ")) {
          const items = paragraph.split("\n").filter((line) => line.trim().startsWith("• "))
          const listItems = items.map((item) => `<li>${item.replace("• ", "").trim()}</li>`).join("")
          return `<ul>${listItems}</ul>`
        }
        // Regular paragraphs
        return `<p>${paragraph.replace(/\n/g, "<br>")}</p>`
      })
      .join("")
  }

  return (
    <Card className={cn("w-full max-w-4xl", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Compose Email with Template
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* To Field */}
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full"
          />
          {leadData && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Lead:</span>
              <Badge variant="outline">{leadData.name}</Badge>
              <span>•</span>
              <span>{leadData.company}</span>
            </div>
          )}
        </div>

        {/* Template Search */}
        <div className="space-y-2">
          <Label htmlFor="template-search">Select Email Template</Label>
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="template-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name, subject, or folder..."
                className="pl-10 pr-10"
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Template className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{template.name}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mb-1">{template.subject}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.folder}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.module}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    {searchQuery.length < 2 ? "Type to search templates..." : "No templates found"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Template className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Template</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTemplate(null)
                  setSubject("")
                  setContent("")
                  setSearchQuery("")
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{selectedTemplate.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedTemplate.folder}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedTemplate.module}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Subject Field */}
        {selectedTemplate && (
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full"
            />
          </div>
        )}

        {/* Content Field - Always show as editable text */}
        {selectedTemplate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Email Content</Label>
              <Badge variant="outline" className="text-xs">
                Editable Text Format
              </Badge>
            </div>

            <Textarea
              ref={contentRef}
              id="content"
              value={content.includes("<") ? htmlToText(content) : content}
              onChange={(e) => setContent(textToHtml(e.target.value))}
              placeholder="Email content will appear here after selecting a template..."
              className="w-full min-h-[300px] text-sm"
              rows={15}
            />

            <p className="text-xs text-gray-500">
              Edit the email content as plain text. Formatting will be preserved when sent. Use double line breaks for
              paragraphs and • for bullet points.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedTemplate ? (
              <span>✓ Template loaded and ready to send</span>
            ) : (
              <span>Search and select a template to compose email</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}

            <Button
              onClick={handleSend}
              disabled={!selectedTemplate || !to || !subject || !content || sending}
              className="min-w-[120px]"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

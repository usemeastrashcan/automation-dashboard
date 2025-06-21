"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Send,
  User,
  Bot,
  Mail,
  Phone,
  Building,
  MessageSquare,
  Activity,
  Paperclip,
  X,
  FileText,
} from "lucide-react"
import { InteractiveContentRenderer } from "@/components/interactive-content-renderer"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  attachments?: FileAttachment[]
}

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  Activity?: string
  cf_Thread_ID?: string
}

interface EmailDraft {
  to: string
  subject: string
  body: string
  emailType: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initializingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  // Allowed file types
  const allowedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "application/rtf",
    "text/markdown",
  ]

  const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".csv", ".rtf", ".md"]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // File validation function
  const validateFile = (file: File): boolean => {
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    const isValidType = allowedFileTypes.includes(file.type) || allowedExtensions.includes(fileExtension)
    const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit

    if (!isValidType) {
      alert(`File type not supported. Please upload: ${allowedExtensions.join(", ")}`)
      return false
    }

    if (!isValidSize) {
      alert("File size must be less than 10MB")
      return false
    }

    return true
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(validateFile)

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload files to OpenAI Assistant
  const uploadFilesToAssistant = async (files: File[]): Promise<FileAttachment[]> => {
    const uploadedFiles: FileAttachment[] = []

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("purpose", "assistants")

        const response = await fetch("/api/chat/upload-file", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const data = await response.json()

        uploadedFiles.push({
          id: data.fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: data.url,
        })
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        alert(`Failed to upload ${file.name}. Please try again.`)
      }
    }

    return uploadedFiles
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (initializingRef.current) return
      initializingRef.current = true

      try {
        setInitializing(true)

        console.log(`Loading lead details for ID: ${leadId}`)
        const leadResponse = await fetch(`/api/lead/${leadId}`)
        if (!leadResponse.ok) {
          throw new Error(`Failed to load lead details: ${leadResponse.status}`)
        }
        const leadData = await leadResponse.json()

        if (!leadData.success || !leadData.lead) {
          throw new Error("Lead not found")
        }

        setLead(leadData.lead)

        const threadResponse = await fetch(`/api/chat/thread`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            existingThreadId: leadData.lead.cf_Thread_ID,
          }),
        })

        if (!threadResponse.ok) {
          throw new Error(`Failed to initialize chat thread: ${threadResponse.status}`)
        }

        const threadData = await threadResponse.json()

        if (!threadData.success) {
          throw new Error(threadData.error || "Failed to initialize thread")
        }

        setThreadId(threadData.threadId)

        if (threadData.messages && threadData.messages.length > 0) {
          const filteredMessages = threadData.messages.filter((msg: Message) => {
            const isInitMessage =
              msg.role === "assistant" &&
              (msg.content.includes("Lead Record Information:") ||
                msg.content.includes("IMPORTANT: Based on this lead's current activity status") ||
                msg.content.includes("This is a CRM management session"))
            return !isInitMessage
          })
          setMessages(filteredMessages)
        }

        if (!threadData.isExisting) {
          const leadRecordMessage = `Lead Record Information:

Name: ${leadData.lead.name}
Company: ${leadData.lead.company}
Email: ${leadData.lead.email}
Phone: ${leadData.lead.phone || "Not provided"}
Current Activity: ${leadData.lead.Activity || "No activity set"}
Lead ID: ${leadData.lead.id}

IMPORTANT: Based on this lead's current activity status, please:
1. Greet the user and analyze the current activity status
2. Suggest the next logical action based on the workflow
3. Ask for confirmation before proceeding with any action
4. Guide the user through the complete lead management process

This is a CRM management session where you should proactively guide the workflow based on the lead's current status.`

          try {
            const response = await fetch(`/api/chat/message`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                threadId: threadData.threadId,
                message: leadRecordMessage,
                leadId: leadData.lead.id,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              const leadInfoMessage: Message = {
                id: data.messageId,
                role: "assistant",
                content: data.content,
                timestamp: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, leadInfoMessage])
            }
          } catch (error) {
            console.error("Failed to send lead record:", error)
          }
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error)
        setError(error instanceof Error ? error.message : "Failed to initialize chat")
      } finally {
        setInitializing(false)
        initializingRef.current = false
        focusInput()
      }
    }

    if (leadId && !initializingRef.current) {
      initializeChat()
    }
  }, [leadId])

  const sendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || !threadId || loading) return

    setUploadingFiles(true)
    let uploadedFiles: FileAttachment[] = []

    // Upload files if any are selected
    if (selectedFiles.length > 0) {
      uploadedFiles = await uploadFilesToAssistant(selectedFiles)
      if (uploadedFiles.length !== selectedFiles.length) {
        setUploadingFiles(false)
        return // Some files failed to upload
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim() || "I've uploaded some documents for you to analyze.",
      timestamp: new Date().toISOString(),
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSelectedFiles([])
    setLoading(true)
    setUploadingFiles(false)

    try {
      const response = await fetch(`/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: input.trim() || "I've uploaded some documents for you to analyze.",
          leadId,
          fileIds: uploadedFiles.map((file) => file.id),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: data.messageId,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Failed to send message:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      focusInput()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEmailSend = async (emailData: EmailDraft) => {
    try {
      console.log("📧 Sending email:", emailData)

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          leadId: leadId,
          emailType: emailData.emailType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Add success message to chat
        const successMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `✅ Email sent successfully to ${emailData.to}!\n\nSubject: ${emailData.subject}\nType: ${emailData.emailType}\n\nThe email has been delivered and any relevant lead fields have been updated.`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, successMessage])
      } else {
        throw new Error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Email sending error:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleSaveAsPrompt = (prompt: string) => {
    // Create a new user message with the edited email content
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    }

    // Add the message to chat and trigger AI response
    setMessages((prev) => [...prev, userMessage])

    // Send to AI for response
    if (threadId) {
      fetch(`/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: prompt,
          leadId,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          const assistantMessage: Message = {
            id: data.messageId,
            role: "assistant",
            content: data.content,
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        })
        .catch((error) => {
          console.error("Failed to send edited email prompt:", error)
        })
    }
  }

  useEffect(() => {
    console.log(
      "💬 Current messages:",
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        contentPreview: m.content.substring(0, 100) + "...",
        hasEmailKeywords: m.content.toLowerCase().includes("subject") || m.content.toLowerCase().includes("dear"),
      })),
    )
  }, [messages])

  if (initializing) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Initializing chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load lead details</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Lead Information */}
      <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{lead.name}</h1>
              <Badge variant="outline" className="text-xs">
                Lead
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-gray-600">{lead.company}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-600 break-all">{lead.email}</p>
                </div>
              </div>

              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{lead.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Lead Activity & Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Current Activity</p>
                  {lead.Activity ? (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {lead.Activity}
                    </Badge>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">No activity set</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Messages</p>
                  <p className="text-sm text-gray-600">{messages.length} messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              <p className="text-sm text-gray-600">Ready to help with {lead.name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm">Ask questions about this lead or get assistance with your tasks</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-4 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <Card className={`${message.role === "user" ? "bg-blue-600 text-white" : "bg-white shadow-sm"}`}>
                    <CardContent className="p-4">
                      {message.role === "assistant" ? (
                        <InteractiveContentRenderer
                          content={message.content}
                          onEmailSend={handleEmailSend}
                          onSaveAsPrompt={handleSaveAsPrompt}
                          leadId={leadId}
                          leadData={lead}
                        />
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.attachments.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                  <FileText className="w-4 h-4" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{file.name}</p>
                                    <p className="text-xs opacity-75">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <p className={`text-xs mt-2 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t p-6 flex-shrink-0">
          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected files:</p>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading || uploadingFiles}
                className="pr-12"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploadingFiles}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={sendMessage}
              disabled={loading || uploadingFiles || (!input.trim() && selectedFiles.length === 0)}
              size="lg"
            >
              {uploadingFiles ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.rtf,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line. Attach documents: PDF, DOC, DOCX, TXT, CSV, RTF, MD
          </p>
        </div>
      </div>
    </div>
  )
}

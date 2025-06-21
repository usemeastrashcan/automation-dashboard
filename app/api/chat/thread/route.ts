import { type NextRequest, NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set")
}

if (!ASSISTANT_ID) {
  console.error("OPENAI_ASSISTANT_ID environment variable is not set")
}

export async function POST(request: NextRequest) {
  try {
    const { leadId, existingThreadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ success: false, error: "Lead ID is required" }, { status: 400 })
    }

    if (!OPENAI_API_KEY || !ASSISTANT_ID) {
      return NextResponse.json({ success: false, error: "OpenAI configuration missing" }, { status: 500 })
    }

    let threadId = existingThreadId
    let messages: any[] = []

    // If thread exists, verify it's still valid and load messages
    if (existingThreadId) {
      console.log(`Checking existing thread: ${existingThreadId}`)
      try {
        // Verify thread exists by trying to get messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${existingThreadId}/messages`, {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
        })

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          // Filter out initialization messages from the loaded messages
          messages = messagesData.data
            .reverse()
            .filter((msg: any) => {
              // Filter out initialization messages
              const content = msg.content[0]?.text?.value || ""
              const isInitMessage =
                content.includes("Lead Record Information:") ||
                content.includes("IMPORTANT: Based on this lead's current activity status") ||
                content.includes("This is a CRM management session")
              return !isInitMessage
            })
            .map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content[0]?.text?.value || "",
              timestamp: new Date(msg.created_at * 1000).toISOString(),
            }))

          console.log(`Using existing thread ${existingThreadId} with ${messages.length} filtered messages`)

          // Return early with existing thread
          return NextResponse.json({
            success: true,
            threadId: existingThreadId,
            messages,
            isExisting: true,
          })
        } else {
          console.log("Existing thread not found or invalid, creating new one")
          threadId = null
        }
      } catch (error) {
        console.log("Error checking existing thread, creating new one:", error)
        threadId = null
      }
    }

    // Create new thread only if we don't have a valid existing one
    if (!threadId) {
      console.log("Creating new thread for lead:", leadId)
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({}),
      })

      if (!threadResponse.ok) {
        throw new Error("Failed to create thread")
      }

      const threadData = await threadResponse.json()
      threadId = threadData.id
      console.log(`Created new thread: ${threadId}`)

      // Update lead with thread ID
      await zohoCRM.updateLeadThreadId(leadId, threadId)
      console.log(`Updated lead ${leadId} with thread ID ${threadId}`)
    }

    return NextResponse.json({
      success: true,
      threadId,
      messages,
      isExisting: false,
    })
  } catch (error) {
    console.error("Thread initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize thread",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

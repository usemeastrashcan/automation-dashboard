import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

export async function GET() {
  try {
    if (!OPENAI_API_KEY || !ASSISTANT_ID) {
      return NextResponse.json({ error: "Missing OpenAI configuration" }, { status: 500 })
    }

    // Get assistant details
    const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
    })

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text()
      return NextResponse.json({ error: `Failed to get assistant: ${errorText}` }, { status: 500 })
    }

    const assistant = await assistantResponse.json()

    // Create a test thread
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
      return NextResponse.json({ error: "Failed to create test thread" }, { status: 500 })
    }

    const thread = await threadResponse.json()

    // Add a test message asking for file contents
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        role: "user",
        content:
          "Please list all files you have access to and show me a sample from the quotations_email_template.pdf file.",
      }),
    })

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        tools: [{ type: "file_search" }],
      }),
    })

    const run = await runResponse.json()

    // Wait for completion (simplified)
    let attempts = 0
    let runStatus = "in_progress"

    while (runStatus === "in_progress" || runStatus === "queued") {
      if (attempts > 30) break

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      })

      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }

    // Get the response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
    })

    const messages = await messagesResponse.json()
    const assistantMessage = messages.data.find((msg: any) => msg.role === "assistant")

    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        tools: assistant.tools,
        file_ids: assistant.file_ids || [],
        tool_resources: assistant.tool_resources,
      },
      testResponse: assistantMessage?.content[0]?.text?.value || "No response",
      runStatus,
    })
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json(
      { error: "Test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

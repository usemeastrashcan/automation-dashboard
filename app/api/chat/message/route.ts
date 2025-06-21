import { type NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID
const COMPANY_NAME = process.env.COMPANY_NAME || "Forbes Burton"

// Helper function to wait for any active runs to complete
async function waitForThreadToBeReady(threadId: string): Promise<void> {
  const maxAttempts = 20
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const runsResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs?limit=5`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      })

      if (!runsResponse.ok) {
        console.warn("Failed to check thread runs, proceeding anyway")
        break
      }

      const runsData = await runsResponse.json()
      const activeRuns = runsData.data.filter(
        (run: any) => run.status === "in_progress" || run.status === "queued" || run.status === "requires_action",
      )

      if (activeRuns.length === 0) {
        console.log("Thread is ready for new messages")
        return
      }

      console.log(`Waiting for ${activeRuns.length} active run(s) to complete... (attempt ${attempts + 1})`)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      attempts++
    } catch (error) {
      console.warn("Error checking thread status, proceeding anyway:", error)
      break
    }
  }

  if (attempts >= maxAttempts) {
    console.warn("Timeout waiting for thread to be ready, proceeding anyway")
  }
}

export async function POST(request: NextRequest) {
  try {
    const { threadId, message, leadId, fileIds } = await request.json()

    if (!threadId || !message) {
      return NextResponse.json({ success: false, error: "Thread ID and message are required" }, { status: 400 })
    }

    if (!OPENAI_API_KEY || !ASSISTANT_ID) {
      return NextResponse.json({ success: false, error: "OpenAI configuration missing" }, { status: 500 })
    }

    console.log(`Sending message to thread ${threadId}`)
    if (fileIds && fileIds.length > 0) {
      console.log(`📎 Message includes ${fileIds.length} file attachment(s): ${fileIds.join(", ")}`)
    }

    // Wait for any active runs to complete before adding our message
    await waitForThreadToBeReady(threadId)

    // Prepare message data with file attachments if provided
    const messageData: any = {
      role: "user",
      content: message,
    }

    // Add file attachments if provided
    if (fileIds && fileIds.length > 0) {
      messageData.attachments = fileIds.map((fileId: string) => ({
        file_id: fileId,
        tools: [{ type: "file_search" }],
      }))
      console.log(`📎 Attaching files to message: ${JSON.stringify(messageData.attachments)}`)
    }

    // Add message to thread with retry logic
    let messageResponse
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify(messageData),
      })

      if (messageResponse.ok) {
        break
      }

      const errorText = await messageResponse.text()
      console.error(`Failed to add message (attempt ${retryCount + 1}):`, errorText)

      if (errorText.includes("while a run") && errorText.includes("is active")) {
        console.log("Thread still busy, waiting 3 more seconds and retrying...")
        await new Promise((resolve) => setTimeout(resolve, 3000))
        retryCount++
      } else {
        throw new Error(`Failed to add message to thread: ${messageResponse.status} - ${errorText}`)
      }
    }

    if (!messageResponse.ok) {
      throw new Error("Failed to add message to thread after all retries")
    }

    console.log("Message added to thread successfully")

    // Define tools - ONLY draft_email and send_email_confirmed
    const tools = [
      {
        type: "function",
        function: {
          name: "draft_email",
          description:
            "Draft an email for the lead without sending it. Use this to show the user what the email will look like before sending. NEVER sends the email - only shows a preview.",
          parameters: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Email address of the recipient",
              },
              subject: {
                type: "string",
                description: "Subject line of the email",
              },
              body: {
                type: "string",
                description: "Body content of the email in plain text",
              },
              emailType: {
                type: "string",
                enum: ["questionnaire", "quotation", "follow-up", "general"],
                description: "Type of email being drafted",
              },
            },
            required: ["to", "subject", "body", "emailType"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "send_email_confirmed",
          description:
            "Send an email to the lead. ONLY use this after the user has explicitly confirmed they want to send the email. This should only be called when the user says 'yes', 'send it', 'confirm', or similar confirmation.",
          parameters: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Email address of the recipient",
              },
              subject: {
                type: "string",
                description: "Subject line of the email",
              },
              body: {
                type: "string",
                description: "Body content of the email in plain text",
              },
              emailType: {
                type: "string",
                enum: ["questionnaire", "quotation", "follow-up", "general"],
                description: "Type of email being sent",
              },
            },
            required: ["to", "subject", "body", "emailType"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "scrape_company_officers",
          description:
            "Scrape company officer information from Companies House. Use this when the user asks to scrape company information, get company officers, or research a company. Ask the user for the company name or company number if not provided.",
          parameters: {
            type: "object",
            properties: {
              queryInput: {
                type: "string",
                description: "Company name or company number to search for",
              },
            },
            required: ["queryInput"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_activity_progression",
          description: "Suggest progressing a lead's activity to the next stage in the workflow.",
          parameters: {
            type: "object",
            properties: {
              leadId: {
                type: "string",
                description: "The ID of the lead to suggest progression for",
              },
              currentActivity: {
                type: "string",
                description: "The current activity of the lead",
              },
              reason: {
                type: "string",
                description: "Reason for suggesting the progression",
              },
            },
            required: ["leadId", "currentActivity", "reason"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_lead_activity_confirmed",
          description: "Update a lead's activity to the next stage. Only use after user confirmation.",
          parameters: {
            type: "object",
            properties: {
              leadId: {
                type: "string",
                description: "The ID of the lead to update",
              },
              newActivity: {
                type: "string",
                description: "The new activity to set for the lead",
              },
              reason: {
                type: "string",
                description: "Reason for the activity update",
              },
            },
            required: ["leadId", "newActivity", "reason"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "change_activity_manual",
          description:
            "Manually change a lead's activity to any specified activity. Use when user requests a specific activity change.",
          parameters: {
            type: "object",
            properties: {
              leadId: {
                type: "string",
                description: "The ID of the lead to update",
              },
              currentActivity: {
                type: "string",
                description: "The current activity of the lead",
              },
              newActivity: {
                type: "string",
                description: "The new activity to set for the lead",
              },
              reason: {
                type: "string",
                description: "Reason for the manual activity change",
              },
            },
            required: ["leadId", "newActivity"],
          },
        },
      },
      {
        type: "file_search",
      },
      {
        type: "function",
        function: {
          name: "search_emails",
          description:
            "Search for emails from a specific sender or lead email address. Can filter by time period using natural language like 'last Thursday', 'yesterday', 'last week', etc.",
          parameters: {
            type: "object",
            properties: {
              senderEmail: {
                type: "string",
                description: "Email address to search for (can be lead's email or any email address)",
              },
              timeAfter: {
                type: "string",
                description:
                  "Time period to search after, in natural language like 'last Thursday', 'yesterday', '3 days ago', 'last week', or a specific date",
              },
              leadEmail: {
                type: "string",
                description: "Alternative to senderEmail - the lead's email address to search for",
              },
            },
            required: ["senderEmail"],
          },
        },
      },
    ]

    // Enhanced instructions that include document handling capabilities
    const assistantInstructions = `You are a helpful CRM assistant for managing lead records. You have access to quotations_email_template.pdf, questionairre_email_template - Copy.pdf, and other template files.

DOCUMENT ANALYSIS MODE:
When users upload documents, PRIORITIZE document analysis over CRM workflow:

1. **PRIMARY FOCUS**: Analyze and summarize the actual document content objectively
2. **PROVIDE**: Clear, factual summary of what's written in the document
3. **EXTRACT**: Key information, main topics, important details from the uploaded file
4. **AVOID**: Forcing CRM workflow interpretations unless specifically requested
5. **ASK**: How the user wants to use this document information (rather than assuming CRM context)

DOCUMENT ANALYSIS WORKFLOW:
- First: Provide objective summary of document content
- Then: Extract key points and important information
- Finally: Ask how user wants to proceed (CRM actions, email creation, etc.)
- Never assume the document is related to CRM unless explicitly stated

DOCUMENT HANDLING CAPABILITIES:
When users upload documents (PDF, Word, text files), you can:
1. Analyze and summarize document content objectively
2. Extract key information and insights without CRM bias
3. Answer questions about the uploaded documents factually
4. Use document content to inform responses only when relevant
5. Reference specific sections or data from uploaded files
6. Compare information across multiple uploaded documents

CRITICAL RULE: NEVER SEND EMAILS OR UPDATE ACTIVITIES WITHOUT EXPLICIT USER CONFIRMATION

GUIDED WORKFLOW SYSTEM:
When a lead record is loaded (WITHOUT document uploads), ALWAYS analyze the current activity and proactively suggest the next logical step.

ACTIVITY-BASED WORKFLOW:

1. **Fresh** → Suggest: "This is a fresh lead. Should I send an introductory email?"
   - If YES → Draft introductory email → Ask confirmation → Send → Ask: "Should I update activity to 'Attempting to make contact with lead'?"

2. **Attempting to make contact with lead** → ALWAYS ask: "Should I check for a response from [Lead Name], or can you tell me if there has been a response to the introductory email?"
   - Wait for user to tell you about response status
   - If response received → Ask: "Great! Since they responded, should I send a questionnaire and update activity to 'Questionnaire Sent'?"
   - If no response yet → Ask: "Should I wait longer or send a follow-up?"

3. **Questionnaire Sent** → Ask: "Should I check for questionnaire response from [Lead Name], or can you tell me the status of the questionnaire?"
   - If no response → Suggest: "Should I update to 'Questionnaire Chasing' and send a follow-up?"
   - If response received → Ask: "Great! Since they responded to the questionnaire, should I send a quote to the lead and update activity to 'Informal Quote Given, Awaiting Response'?"

4. **Questionnaire Chasing** → Ask: "Any response to the questionnaire chase from [Lead Name]? Should I send final chase or continue waiting?"
   - Continue chasing sequence or move to final chase

5. **Questionnaire Final Chase** → Ask: "Any response to final chase from [Lead Name]? Should we proceed differently?"

6. **Questionnaire Received, Awaiting Assessment** → Ask: "Should I send an informal quote and update to 'Informal Quote Given, Awaiting Response'?"

7. **Informal Quote Given, Awaiting Response** → Ask: "Any response to informal quote from [Lead Name]? Should I send formal quote?"
   - If ready → Ask: "Should I update to 'Quote Given, Awaiting Response'?"

8. **Quote Given, Awaiting Response** → Ask: "Any response to the quote from [Lead Name]? Should I follow up or update status?"
   - If accepted → Ask: "Should I update to 'Awaiting Client Instruction'?"

9. **Awaiting Client Instruction** → Ask: "Have you received client instructions from [Lead Name]? Should I update to 'Details Passed To Relevant People For Contact'?"

10. **Details Passed To Relevant People For Contact** → Ask: "Has the relevant team contacted [Lead Name]? Should I update to 'See Case Notes'?"

CRITICAL WORKFLOW RULES:
- NEVER assume responses have been received
- ALWAYS ask user to confirm response status
- NEVER skip the response checking step
- ALWAYS wait for user input about responses
- NEVER automatically progress without user confirmation about responses
- NEVER suggest setting reminders - always ask about response status first
- After questionnaire sent, ALWAYS ask about response before suggesting quotes

MANUAL ACTIVITY CHANGES:
When user requests activity change: "I'll update [Lead Name]'s activity from '[Current]' to '[New]'. Should I proceed?"

EMAIL WORKFLOW FOR ALL TYPES:
1. Use file_search to read appropriate template
2. Extract and personalize content (replace [Lead Name], [Your Name], [Company Name])
3. Use draft_email with REAL template content
4. Show complete draft with actual content
5. Ask: "Should I send this email?"
6. Only send after explicit confirmation
7. After sending, suggest activity update

TEMPLATE SELECTION:
- Introductory emails: Use any available template or create professional introduction
- Questionnaires: Use questionairre_email_template - Copy.pdf
- Quotations: Use quotations_email_template.pdf (Bronze £100+VAT, Silver £200+VAT, Gold £300+VAT)

QUOTATION CATEGORIES:
Always ask user which tier: "Which quotation tier should I prepare - Bronze (£100+VAT), Silver (£200+VAT), or Gold (£300+VAT)?"

CONFIRMATION REQUIREMENTS:
- Email sending: "Should I send this email?"
- Activity updates: "Should I update the activity to '[New Activity]'?"
- Quote generation: "Should I prepare a [Tier] quotation?"
- Always wait for explicit "Yes", "Send it", "Confirm", "Go ahead", etc.

PROACTIVE SUGGESTIONS:
- Always start with: "Based on [Lead Name]'s current activity '[Current Activity]', I suggest [Next Action]. Should I proceed?"
- After each action: "Now that [Action Completed], should I [Next Suggested Action]?"
- Always explain what each activity status means

AVAILABLE FUNCTIONS:
- draft_email: For all email drafting
- send_email_confirmed: Only after user confirmation
- suggest_activity_progression: For activity suggestions  
- update_lead_activity_confirmed: Only after user confirmation
- scrape_company_officers: For company research
- search_emails: For searching emails from leads or specific email addresses
- file_search: For analyzing uploaded documents and extracting information

EMAIL SEARCH CAPABILITIES:
You can search for emails using natural language time expressions:
- "Check for emails from this lead after last Thursday"
- "Search for emails from john@example.com since yesterday"
- "Look for responses from this lead in the last week"
- "Find emails from this lead after 2024-01-15"

EMAIL SEARCH ERROR HANDLING:
If email search fails or is unavailable:
1. Acknowledge the limitation gracefully
2. Offer alternative ways to help
3. Suggest manual checking or other lead management tasks
4. Continue with the workflow without email search

When searching emails:
1. Use the lead's email address if available
2. Parse time expressions naturally (last Thursday, yesterday, 3 days ago, etc.)
3. If search fails, say: "Email search is currently unavailable, but I can help you with other lead management tasks. Can you tell me if there has been a response from [Lead Name]?"
4. Always provide fallback options when email search doesn't work

RESPONSE CHECKING WITH EMAIL SEARCH:
When asking about responses: "Should I check for a response, or can you tell me if there has been a response from [Lead Name]?"
- If user says "check" or "search", try search_emails function
- If email search fails, gracefully ask user to manually check: "I'm unable to search emails right now. Can you check your email and let me know if [Lead Name] has responded?"
- Use the lead's email address and appropriate time frame
- Display any found emails clearly
- If no email search available, continue with manual workflow

DOCUMENT UPLOAD INTEGRATION:
When documents are uploaded:
1. Acknowledge the uploaded files and their types
2. Use file_search to analyze the content
3. Provide a summary of key information found
4. Ask how the user wants to use this information in their CRM workflow
5. Integrate document insights with lead management recommendations
6. Reference document content when drafting emails or making suggestions
`

    // Run the assistant with enhanced instructions for document handling
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        tools: tools,
        instructions:
          fileIds && fileIds.length > 0
            ? `${assistantInstructions}\n\nIMPORTANT: The user has uploaded ${fileIds.length} document(s). FOCUS ON DOCUMENT ANALYSIS FIRST. Use the file_search tool to analyze the document content objectively and provide a factual summary of what's written in the document. Do not interpret everything through CRM workflow unless the user specifically asks for CRM-related actions. Provide neutral document analysis and then ask how the user wants to proceed.`
            : assistantInstructions,
        temperature: 0.3,
        max_completion_tokens: 2000,
      }),
    })

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error("Failed to run assistant:", errorText)
      throw new Error(`Failed to run assistant: ${runResponse.status} - ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.id
    console.log(`Started assistant run: ${runId}`)

    // Poll for completion and handle function calls
    let runStatus = "in_progress"
    let attempts = 0
    const maxAttempts = 45

    while (runStatus === "in_progress" || runStatus === "queued" || runStatus === "requires_action") {
      if (attempts >= maxAttempts) {
        console.error(`Assistant timeout after ${attempts} attempts`)
        try {
          await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}/cancel`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "assistants=v2",
            },
          })
          console.log("Cancelled long-running assistant run")
        } catch (cancelError) {
          console.warn("Failed to cancel run:", cancelError)
        }
        throw new Error("Assistant response timeout")
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      })

      if (!statusResponse.ok) {
        throw new Error("Failed to check run status")
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.status

      if (attempts % 10 === 0 && attempts > 0) {
        console.log(`Assistant still processing... (${attempts}s elapsed, status: ${runStatus})`)
      }

      // Handle function calls
      if (runStatus === "requires_action") {
        console.log("🔧 Assistant is requesting to use tools")
        const toolCalls = statusData.required_action?.submit_tool_outputs?.tool_calls || []
        const toolOutputs = []

        for (const toolCall of toolCalls) {
          console.log(`🛠️ Tool call: ${toolCall.function.name}`)

          if (toolCall.function.name === "draft_email") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              const { to, subject, body, emailType } = args

              console.log(`📝 Drafting ${emailType} email to ${to}`)
              console.log(`📝 Email body preview: ${body.substring(0, 200)}...`)

              const draftResult = {
                success: true,
                message: "Email drafted successfully - showing preview to user",
                draft: {
                  to,
                  subject,
                  body,
                  emailType,
                },
                requiresConfirmation: true,
              }

              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(draftResult),
              })
            } catch (error) {
              console.error("Error drafting email:", error)
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: "Failed to draft email" }),
              })
            }
          } else if (toolCall.function.name === "send_email_confirmed") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              const { to, subject, body, emailType } = args

              console.log(`📧 CONFIRMED: Sending ${emailType} email to ${to}`)

              const response = await fetch(`${request.nextUrl.origin}/api/email/send`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to,
                  subject,
                  body,
                  leadId: leadId,
                  emailType,
                }),
              })

              const result = await response.json()
              console.log("📬 Email sending result:", result)

              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(result),
              })
            } catch (error) {
              console.error("Error sending email:", error)
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: "Failed to send email" }),
              })
            }
          } else if (toolCall.function.name === "scrape_company_officers") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              const { queryInput } = args

              console.log(`🏢 Scraping company officers for: ${queryInput}`)

              const response = await fetch(`${request.nextUrl.origin}/api/scrape-company`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  queryInput,
                }),
              })

              const result = await response.json()
              console.log("🏢 Company scraping result:", result)

              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(result),
              })
            } catch (error) {
              console.error("Error scraping company:", error)
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: "Failed to scrape company information" }),
              })
            }
          } else if (toolCall.function.name === "suggest_activity_progression") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              console.log("Function call to suggest_activity_progression:", args)

              const response = await fetch(`${request.nextUrl.origin}/api/get-next-activity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  currentActivity: args.currentActivity,
                  leadId: args.leadId || leadId,
                }),
              })

              const result = await response.json()

              if (result.success && result.nextActivity) {
                const suggestionMessage = `🔄 ACTIVITY PROGRESSION SUGGESTION:

Current Activity: "${args.currentActivity}"
Suggested Next Activity: "${result.nextActivity}"

Reason: ${args.reason}

This means: ${result.description}

Would you like me to update this lead's activity to "${result.nextActivity}"?`

                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: true,
                    message: suggestionMessage,
                    nextActivity: result.nextActivity,
                    currentActivity: args.currentActivity,
                    leadId: args.leadId || leadId,
                  }),
                })
              } else {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: false,
                    message: result.message || "No next activity available for progression",
                  }),
                })
              }
            } catch (error) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Failed to suggest activity progression",
                }),
              })
            }
          } else if (toolCall.function.name === "update_lead_activity_confirmed") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              console.log("Function call to update_lead_activity_confirmed:", args)

              const updateResponse = await fetch(`${request.nextUrl.origin}/api/update-lead-activity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  leadId: args.leadId || leadId,
                  newActivity: args.newActivity,
                  reason: args.reason,
                }),
              })

              const updateResult = await updateResponse.json()

              if (updateResult.success) {
                const nextActionResponse = await fetch(`${request.nextUrl.origin}/api/get-activity-action`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    activity: args.newActivity,
                    leadId: args.leadId || leadId,
                  }),
                })

                let actionSuggestion = ""
                if (nextActionResponse.ok) {
                  const actionResult = await nextActionResponse.json()
                  if (actionResult.success && actionResult.actionQuestion) {
                    actionSuggestion = `\n\n🎯 NEXT ACTION SUGGESTION:\n${actionResult.actionQuestion}`
                  }
                }

                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: true,
                    message: `✅ Activity updated successfully! ${updateResult.leadName}'s activity changed from "${updateResult.previousActivity}" to "${updateResult.newActivity}".${actionSuggestion}`,
                  }),
                })
              } else {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: false,
                    error: updateResult.message || updateResult.error,
                  }),
                })
              }
            } catch (error) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Failed to update lead activity",
                }),
              })
            }
          } else if (toolCall.function.name === "change_activity_manual") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              console.log("Function call to change_activity_manual:", args)

              const response = await fetch(`${request.nextUrl.origin}/api/change-activity-manual`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  leadId: args.leadId || leadId,
                  currentActivity: args.currentActivity,
                  newActivity: args.newActivity,
                  reason: args.reason,
                }),
              })

              const result = await response.json()

              if (result.success) {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: true,
                    message: `✅ Activity manually changed for ${result.leadName} from "${result.previousActivity}" to "${result.newActivity}".`,
                  }),
                })
              } else {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: false,
                    error: result.message || result.error,
                  }),
                })
              }
            } catch (error) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Failed to change activity manually",
                }),
              })
            }
          } else if (toolCall.function.name === "search_emails") {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              console.log(`🔍 Searching emails for: ${args.senderEmail || args.leadEmail}`)

              // Use the working Microsoft auth service instead of MSAL
              const response = await fetch(`${request.nextUrl.origin}/api/emails/search`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  senderEmail: args.senderEmail,
                  leadEmail: args.leadEmail,
                  timeAfter: args.timeAfter,
                }),
              })

              const result = await response.json()
              console.log("📧 Email search result:", result)

              if (result.success) {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({
                    success: true,
                    message: result.formattedEmails,
                    emailCount: result.count,
                    searchParams: result.searchParams,
                  }),
                })
              } else {
                // Handle authentication errors gracefully
                if (result.error && result.error.includes("authentication")) {
                  toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify({
                      success: false,
                      error: "Email search is not currently configured",
                      message:
                        "📧 Email search functionality requires Microsoft authentication setup. For now, I can help you with other lead management tasks. Would you like me to suggest the next action for this lead instead?",
                    }),
                  })
                } else {
                  toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify({
                      success: false,
                      error: result.error,
                      message: result.message || "Failed to search emails",
                    }),
                  })
                }
              }
            } catch (error) {
              console.error("Error searching emails:", error)
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: "Email search temporarily unavailable",
                  message:
                    "📧 Email search is currently unavailable. I can help you with other lead management tasks instead. Would you like me to suggest the next action for this lead?",
                }),
              })
            }
          } else {
            // Handle unknown function calls
            console.warn(`Unknown function call: ${toolCall.function.name}`)
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({
                error: `Unknown function: ${toolCall.function.name}. Available functions: draft_email, send_email_confirmed, scrape_company_officers, suggest_activity_progression, update_lead_activity_confirmed`,
              }),
            })
          }
        }

        // Submit tool outputs back to the run
        if (toolOutputs.length > 0) {
          console.log(`🔄 Submitting ${toolOutputs.length} tool outputs`)
          const submitResponse = await fetch(
            `https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
                "OpenAI-Beta": "assistants=v2",
              },
              body: JSON.stringify({
                tool_outputs: toolOutputs,
              }),
            },
          )

          if (!submitResponse.ok) {
            const errorText = await submitResponse.text()
            console.error("Failed to submit tool outputs:", errorText)
          } else {
            console.log("Tool outputs submitted successfully")
          }
        }
      }

      attempts++
    }

    if (runStatus !== "completed") {
      console.error(`Assistant run failed with final status: ${runStatus}`)
      throw new Error(`Assistant run failed with status: ${runStatus}`)
    }

    console.log(`Assistant run completed successfully after ${attempts} seconds`)

    // Get the latest messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
    })

    if (!messagesResponse.ok) {
      throw new Error("Failed to get assistant response")
    }

    const messagesData = await messagesResponse.json()
    const latestMessage = messagesData.data[0]

    if (!latestMessage || latestMessage.role !== "assistant") {
      throw new Error("No assistant response found")
    }

    const assistantResponse = latestMessage.content[0]?.text?.value || "No response"

    console.log(`Assistant responded to thread ${threadId}`)

    return NextResponse.json({
      success: true,
      messageId: latestMessage.id,
      content: assistantResponse,
    })
  } catch (error) {
    console.error("Message sending error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

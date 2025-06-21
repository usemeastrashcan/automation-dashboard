import { zohoCRM } from "@/lib/zoho-crm"

export async function GET(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const { templateId } = await params

    if (!templateId) {
      return Response.json({ error: "Template ID is required" }, { status: 400 })
    }

    // Get valid access token (with auto-refresh)
    const accessToken = await zohoCRM.getValidAccessToken()
    const baseUrl = process.env.ZOHO_API_BASE_URL

    if (!accessToken || !baseUrl) {
      return Response.json({ error: "Missing Zoho configuration" }, { status: 500 })
    }

    console.log(`✅ Fetching template details: ${baseUrl}/settings/templates/${templateId}?type=email`)

    const response = await fetch(`${baseUrl}/settings/templates/${templateId}?type=email`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Template fetch error: ${response.status} - ${errorText}`)
      return Response.json(
        { error: `Failed to fetch template: ${response.status}`, details: errorText },
        { status: response.status },
      )
    }

    const result = await response.json()

    // Extract the template data - it's directly under 'templates', not 'templates[0]'
    const template = result.templates

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 })
    }

    console.log(`✅ Successfully fetched template: ${template.name}`)

    // Return clean template data
    return Response.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        content: template.content,
        module: template.module,
        folder: template.folder,
        editor_mode: template.editor_mode,
        modified_time: template.modified_time,
        modified_by: template.modified_by,
        attachment_present: template.attachment_present,
        consent_linked: template.consent_linked,
        attachments: template.attachments,
      },
    })
  } catch (error) {
    console.error("❌ Template fetch error:", error)
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

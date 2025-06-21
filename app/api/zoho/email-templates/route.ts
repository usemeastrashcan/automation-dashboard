// Import the existing Zoho service that has token refresh logic
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 200)
    const folder = searchParams.get("folder")

    // Use the existing token management from zohoCRM service
    const accessToken = await zohoCRM.getValidAccessToken()
    const baseUrl = process.env.ZOHO_API_BASE_URL

    if (!baseUrl) {
      return Response.json({ error: "Zoho API base URL not configured" }, { status: 500 })
    }

    // Rest of the code remains the same...
    const endpoint = `${baseUrl}/settings/templates`
    const params = new URLSearchParams({
      type: "email",
      page: page.toString(),
      per_page: limit.toString(),
    })

    if (folder) {
      params.append("folder", folder)
    }

    console.log(`✅ Fetching email templates: ${endpoint}?${params}`)

    const response = await fetch(`${endpoint}?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Templates API error: ${response.status} - ${errorText}`)
      return Response.json(
        {
          error: `Failed to fetch email templates: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const result = await response.json()
    const templates = result.templates || []

    // Transform templates for easier use
    const transformedTemplates = templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      module: template.module,
      folder: template.folder?.name || "Unknown",
      folderId: template.folder?.id,
      editorMode: template.editor_mode,
      modifiedTime: template.modified_time,
      modifiedBy: template.modified_by?.name,
      isFavorite: template.favourite,
      hasAttachment: template.attachment_present,
      consentLinked: template.consent_linked,
    }))

    return Response.json({
      success: true,
      endpoint: `${endpoint}?${params}`,
      data: transformedTemplates,
      pagination: {
        page,
        limit,
        total: result.info?.count || 0,
        hasMore: result.info?.more_records === true,
      },
      folders: [...new Set(templates.map((t: any) => t.folder?.name).filter(Boolean))],
      modules: [...new Set(templates.map((t: any) => t.module).filter(Boolean))],
      rawResponse: result, // For debugging
    })
  } catch (error) {
    console.error("❌ Email templates fetch error:", error)
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

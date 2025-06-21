export async function GET() {
  try {
    const accessToken = process.env.ZOHO_ACCESS_TOKEN
    const baseUrl = process.env.ZOHO_API_BASE_URL

    if (!accessToken || !baseUrl) {
      return Response.json({ error: "Zoho credentials not configured" }, { status: 401 })
    }

    // Test various endpoints to see what's available
    const testEndpoints = [
      `${baseUrl}/settings`,
      `${baseUrl}/settings/templates`,
      `${baseUrl}/settings/email_templates`,
      `${baseUrl}/Templates`,
      `${baseUrl}/settings/Templates`,
      `${baseUrl}/org`,
      `${baseUrl}/users`,
    ]

    const results = []

    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        })

        const responseText = await response.text()
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        results.push({
          endpoint,
          status: response.status,
          success: response.ok,
          data: response.ok ? responseData : null,
          error: !response.ok ? responseData : null,
        })
      } catch (error) {
        results.push({
          endpoint,
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return Response.json({
      message: "Endpoint debugging results",
      baseUrl,
      results,
      workingEndpoints: results.filter((r) => r.success),
      failedEndpoints: results.filter((r) => !r.success),
    })
  } catch (error) {
    return Response.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

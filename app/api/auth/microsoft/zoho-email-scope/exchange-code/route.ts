export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return Response.json({ error: "Authorization code is required" }, { status: 400 })
    }

    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/zoho-email-scope/callback`

    console.log("Exchanging code for tokens...")
    console.log("Code:", code)
    console.log("Redirect URI:", redirectUri)

    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    const responseText = await tokenResponse.text()
    console.log("Token response:", responseText)

    if (!tokenResponse.ok) {
      return Response.json(
        {
          error: "Token exchange failed",
          status: tokenResponse.status,
          details: responseText,
          debugInfo: {
            clientId: clientId?.substring(0, 10) + "...",
            redirectUri,
            codePrefix: code.substring(0, 10) + "...",
          },
        },
        { status: 400 },
      )
    }

    const tokens = JSON.parse(responseText)

    return Response.json({
      success: true,
      message: "✅ Email templates scope authorized successfully!",
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        api_domain: tokens.api_domain,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      },
      nextSteps: [
        "🔧 Update your .env.local file with these values:",
        "",
        `ZOHO_ACCESS_TOKEN=${tokens.access_token}`,
        `ZOHO_REFRESH_TOKEN=${tokens.refresh_token}`,
        `ZOHO_API_BASE_URL=${tokens.api_domain}/crm/v2`,
        `ZOHO_TOKEN_EXPIRY_TIME=${Date.now() + tokens.expires_in * 1000}`,
        "",
        "🧪 Then test: GET /api/test-email-templates",
      ],
    })
  } catch (error) {
    console.error("Code exchange error:", error)
    return Response.json(
      {
        error: "Failed to exchange code for tokens",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

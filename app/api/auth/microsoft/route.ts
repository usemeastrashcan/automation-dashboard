import { NextResponse } from "next/server"
import { microsoftAuthMSAL } from "@/lib/microsoft-auth-msal"

export async function GET() {
  try {
    if (!microsoftAuthMSAL.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Microsoft Graph API not configured",
          message: "Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in your environment variables",
        },
        { status: 500 },
      )
    }

    const authUrl = await microsoftAuthMSAL.getAuthUrl()

    return NextResponse.json({
      success: true,
      authUrl,
      message: "Visit this URL to authenticate with Microsoft",
      configured: true,
      sessionStatus: microsoftAuthMSAL.getSessionStatus(),
    })
  } catch (error) {
    console.error("Microsoft auth URL generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate auth URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

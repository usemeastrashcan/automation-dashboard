import { NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET() {
  try {
    const tokenStatus = zohoCRM.getTokenStatus()
    const accessToken = process.env.ZOHO_ACCESS_TOKEN
    const expiryTime = Number.parseInt(process.env.ZOHO_TOKEN_EXPIRY_TIME || "0", 10)

    const now = Date.now()
    const timeUntilExpiry = expiryTime - now
    const isExpired = timeUntilExpiry <= 0

    return NextResponse.json({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!process.env.ZOHO_REFRESH_TOKEN,
      tokenExpiry: new Date(expiryTime).toISOString(),
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
      isExpired,
      tokenStatus,
      recommendation:
        tokenStatus.consecutiveFailures > 0
          ? "Consider re-authenticating to get fresh tokens"
          : isExpired
            ? "Token is expired and needs refresh"
            : "Token appears healthy",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check token status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

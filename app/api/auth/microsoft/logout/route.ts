import { NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET() {
  try {
    console.log("🔓 Logging out from Microsoft...")

    // Clear the session
    microsoftAuth.forceReloadTokens()

    // Generate logout URL
    const logoutUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/microsoft/logged-out`,
    )}`

    console.log("🔗 Logout URL:", logoutUrl)

    // Return HTML that redirects to Microsoft logout
    const logoutHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logging Out...</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
        .logout { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        .spinner { color: #3b82f6; font-size: 24px; margin-bottom: 20px; }
        h1 { color: #1f2937; margin-bottom: 20px; }
        p { color: #6b7280; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="logout">
        <div class="spinner">🔄</div>
        <h1>Logging Out...</h1>
        <p>Clearing Microsoft session and redirecting...</p>
        <p>You will be able to choose a different account after logout.</p>
      </div>
      <script>
        // Clear any local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to Microsoft logout
        setTimeout(() => {
          window.location.href = "${logoutUrl}";
        }, 2000);
      </script>
    </body>
    </html>
    `

    return new NextResponse(logoutHtml, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("❌ Logout error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to logout",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

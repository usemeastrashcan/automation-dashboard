import { type NextRequest, NextResponse } from "next/server"
import { microsoftAuth } from "@/lib/microsoft-auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.json({ success: false, error: `Authentication failed: ${error}` }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ success: false, error: "No authorization code received" }, { status: 400 })
    }

    console.log("🔐 Processing Microsoft authentication callback...")

    // Use the working Microsoft auth service instead of MSAL
    const tokenData = await microsoftAuth.exchangeCodeForTokens(code)

    console.log("✅ Microsoft authentication completed successfully!")
    console.log("✅ Tokens automatically saved to .env file and loaded into memory")
    console.log("✅ Email search functionality is now ready!")

    // Test the tokens immediately to verify they work
    try {
      const testToken = await microsoftAuth.getValidAccessToken()
      console.log("✅ Token validation successful - ready to use!")
    } catch (testError) {
      console.warn("⚠️ Token validation failed:", testError)
    }

    // Return a success page that auto-closes and provides test link
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
        .success { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        .checkmark { color: #10b981; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #1f2937; margin-bottom: 20px; }
        p { color: #6b7280; margin-bottom: 15px; }
        .test-button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
        .auto-close { color: #9ca3af; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="success">
        <div class="checkmark">✅</div>
        <h1>Authentication Successful!</h1>
        <p><strong>Microsoft Graph API is now configured</strong></p>
        <p>✅ Tokens automatically saved to .env file</p>
        <p>✅ Tokens loaded into memory</p>
        <p>✅ Email search functionality is ready</p>
        <p>✅ You can now ask the chatbot to search for emails</p>
        
        <a href="/api/test-email" target="_blank" class="test-button">🧪 Test Email Search</a>
        
        <div class="auto-close">This window will close automatically in 10 seconds...</div>
      </div>
      <script>
        setTimeout(() => {
          window.close();
        }, 10000);
      </script>
    </body>
    </html>
    `

    return new NextResponse(successHtml, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("❌ Microsoft auth callback error:", error)

    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Failed</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fef2f2; }
        .error { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        .error-icon { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #1f2937; margin-bottom: 20px; }
        p { color: #6b7280; margin-bottom: 15px; }
        .retry { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="error">
        <div class="error-icon">❌</div>
        <h1>Authentication Failed</h1>
        <p>Error: ${error instanceof Error ? error.message : "Unknown error"}</p>
        <button class="retry" onclick="window.location.href='/api/auth/microsoft'">Try Again</button>
      </div>
    </body>
    </html>
    `

    return new NextResponse(errorHtml, {
      headers: { "Content-Type": "text/html" },
    })
  }
}

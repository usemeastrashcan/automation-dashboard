import { NextResponse } from "next/server"

export async function GET() {
  // Clear environment variables for Microsoft tokens
  delete process.env.MICROSOFT_ACCESS_TOKEN
  delete process.env.MICROSOFT_REFRESH_TOKEN
  delete process.env.MICROSOFT_TOKEN_EXPIRY

  const successHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Logged Out Successfully</title>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f9ff; }
      .success { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
      .checkmark { color: #10b981; font-size: 48px; margin-bottom: 20px; }
      h1 { color: #1f2937; margin-bottom: 20px; }
      p { color: #6b7280; margin-bottom: 15px; }
      .auth-button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
    </style>
  </head>
  <body>
    <div class="success">
      <div class="checkmark">✅</div>
      <h1>Logged Out Successfully!</h1>
      <p>Microsoft session has been cleared.</p>
      <p>You can now authenticate with a different Microsoft account.</p>
      
      <a href="/api/auth/microsoft" class="auth-button">🔐 Login with Different Account</a>
      
      <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">
        This window will close automatically in 10 seconds...
      </p>
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
}

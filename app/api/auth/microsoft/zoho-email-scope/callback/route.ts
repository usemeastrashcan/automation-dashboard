export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    return new Response(
      `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error}</p>
          <p><a href="/api/auth/zoho-email-scope">Try Again</a></p>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    )
  }

  if (!code) {
    return new Response(
      `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>❌ No Code Received</h2>
          <p><a href="/api/auth/zoho-email-scope">Try Again</a></p>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    )
  }

  // Show the code to the user so they can copy it
  return new Response(
    `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
        <h2>✅ Authorization Code Received!</h2>
        <p><strong>Your authorization code is:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all;">
          ${code}
        </div>
        
        <h3>Next Steps:</h3>
        <ol>
          <li>Copy the code above</li>
          <li>Use Postman to make this request:</li>
        </ol>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <strong>POST</strong> ${process.env.NEXTAUTH_URL}/api/auth/zoho-email-scope/exchange-code<br><br>
          <strong>Body (JSON):</strong><br>
          <pre>{
  "code": "${code}"
}</pre>
        </div>
        
        <p>Or use this curl command:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; overflow-x: auto;">
curl -X POST ${process.env.NEXTAUTH_URL}/api/auth/zoho-email-scope/exchange-code \\
  -H "Content-Type: application/json" \\
  -d '{"code": "${code}"}'
        </div>
      </body>
    </html>
  `,
    {
      headers: { "Content-Type": "text/html" },
    },
  )
}

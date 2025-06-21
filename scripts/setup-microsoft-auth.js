// Microsoft Graph API Setup Helper
require("dotenv").config()

console.log("🔧 Microsoft Graph API Setup Helper\n")

const requiredEnvVars = ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"]

const optionalEnvVars = ["MICROSOFT_ACCESS_TOKEN", "MICROSOFT_REFRESH_TOKEN", "MICROSOFT_TOKEN_EXPIRY", "NEXTAUTH_URL"]

console.log("📋 Checking environment variables...\n")

let allConfigured = true

requiredEnvVars.forEach((envVar) => {
  const value = process.env[envVar]
  const status = value ? "✅ Set" : "❌ Missing"
  console.log(`${envVar}: ${status}`)
  if (!value) allConfigured = false
})

console.log("\n📋 Optional variables (for persistent auth):\n")

optionalEnvVars.forEach((envVar) => {
  const value = process.env[envVar]
  const status = value ? "✅ Set" : "⚠️  Not set"
  console.log(`${envVar}: ${status}`)
})

console.log("\n" + "=".repeat(60))

if (!allConfigured) {
  console.log("\n❌ Setup incomplete. Please:")
  console.log("1. Create an Azure App Registration")
  console.log("2. Add the required environment variables to your .env file")
  console.log("3. Visit http://localhost:3000/setup for detailed instructions")
} else {
  const hasTokens = process.env.MICROSOFT_ACCESS_TOKEN && process.env.MICROSOFT_REFRESH_TOKEN

  if (!hasTokens) {
    console.log("\n🔐 Configuration complete! Next steps:")
    console.log("1. Start your development server: npm run dev")
    console.log("2. Visit: http://localhost:3000/api/auth/microsoft")
    console.log("3. Follow the authentication flow")
    console.log("4. Add the returned tokens to your .env file")
    console.log("5. Restart your server")
  } else {
    console.log("\n✅ Microsoft Graph API is fully configured!")
    console.log("📧 Email search functionality is ready to use")
    console.log("💬 You can now ask the chatbot to search for emails")
    console.log("\nExample queries:")
    console.log('- "Check for emails from this lead after last Thursday"')
    console.log('- "Search for responses from john@example.com since yesterday"')
    console.log('- "Look for emails from this lead in the last week"')
  }
}

console.log("\n🔗 Useful URLs:")
console.log("- Setup page: http://localhost:3000/setup")
console.log("- Test email config: http://localhost:3000/api/test-email")
console.log("- Microsoft auth: http://localhost:3000/api/auth/microsoft")

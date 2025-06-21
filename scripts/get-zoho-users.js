// Load environment variables from .env file
require("dotenv").config()

// Zoho CRM User Discovery Script
// Run this script to get all users and their IDs

const ZOHO_API_BASE_URL = process.env.ZOHO_API_BASE_URL || "https://www.zohoapis.com/crm/v2"
const ZOHO_ACCESS_TOKEN = process.env.ZOHO_ACCESS_TOKEN

async function fetchZohoUsers() {
  try {
    console.log("🔍 Fetching all Zoho CRM users...\n")

    if (!ZOHO_ACCESS_TOKEN) {
      console.error("❌ ZOHO_ACCESS_TOKEN environment variable is not set")
      console.log("Please check your .env file contains ZOHO_ACCESS_TOKEN=your_token_here")
      return
    }

    console.log("✅ Found access token, making API request...")

    const response = await fetch(`${ZOHO_API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error: ${response.status} - ${errorText}`)

      if (response.status === 401) {
        console.log("\n💡 Token might be expired. Try refreshing your Zoho access token.")
      }
      return
    }

    const data = await response.json()

    if (!data.users || data.users.length === 0) {
      console.log("⚠️ No users found in your Zoho CRM")
      return
    }

    console.log("✅ Found users in your Zoho CRM:\n")
    console.log("ID".padEnd(20) + "Name".padEnd(30) + "Email".padEnd(40) + "Status")
    console.log("-".repeat(100))

    data.users.forEach((user) => {
      const id = user.id || "N/A"
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "N/A"
      const email = user.email || "N/A"
      const status = user.status || "N/A"

      console.log(id.toString().padEnd(20) + name.padEnd(30) + email.padEnd(40) + status)
    })

    console.log("\n📝 To use a specific user for the dashboard:")
    console.log("1. Copy the ID of the user you want")
    console.log("2. Add to your .env file: DASHBOARD_USER_ID=<user_id>")
    console.log("3. Add to your .env file: NEXT_PUBLIC_DASHBOARD_USER_ID=<user_id>")
    console.log("\nExample:")
    console.log("DASHBOARD_USER_ID=1234567890123456789")
    console.log("NEXT_PUBLIC_DASHBOARD_USER_ID=1234567890123456789")

    // Find Chris Leadley automatically if possible
    const chrisUser = data.users.find((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase()
      return fullName.includes("chris") && fullName.includes("leadley")
    })

    if (chrisUser) {
      console.log(`\n🎯 Found Chris Leadley! ID: ${chrisUser.id}`)
      console.log("Add this to your .env file:")
      console.log(`DASHBOARD_USER_ID=${chrisUser.id}`)
      console.log(`NEXT_PUBLIC_DASHBOARD_USER_ID=${chrisUser.id}`)
    }
  } catch (error) {
    console.error("❌ Error fetching users:", error.message)

    if (error.message.includes("fetch is not defined")) {
      console.log("\n💡 You might need to install node-fetch for older Node.js versions:")
      console.log("npm install node-fetch")
    }
  }
}

// Check if dotenv is available
try {
  require.resolve("dotenv")
} catch (e) {
  console.error("❌ dotenv package not found. Installing...")
  console.log("Please run: npm install dotenv")
  process.exit(1)
}

// Run the script
fetchZohoUsers()

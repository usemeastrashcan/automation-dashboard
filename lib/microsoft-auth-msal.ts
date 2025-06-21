import { ConfidentialClientApplication, type AuthenticationResult } from "@azure/msal-node"
import type { Configuration } from "@azure/msal-node"
import { GRAPH_SCOPES, REDIRECT_URI } from "./microsoft-auth-config"
import fs from "fs"
import path from "path"

export const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_APP_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/consumers`, // Explicitly use consumers
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_APP_CLIENT_SECRET || "",
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: any, message: string) {
        console.log(`MSAL: ${message}`)
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Error level
    },
  },
}

interface SessionData {
  msalTokenCache?: string
  isAuthenticated?: boolean
  homeAccountId?: string
}

class MicrosoftAuthMSALService {
  private cca: ConfidentialClientApplication
  private sessionData: SessionData = {}

  constructor() {
    this.cca = new ConfidentialClientApplication(MSAL_CONFIG)
    this.loadSessionFromFile()
  }

  // Load session data from file (simulating session storage)
  private loadSessionFromFile() {
    try {
      const sessionPath = path.join(process.cwd(), ".microsoft-session.json")
      if (fs.existsSync(sessionPath)) {
        const sessionContent = fs.readFileSync(sessionPath, "utf8")
        this.sessionData = JSON.parse(sessionContent)

        // Restore token cache if available
        if (this.sessionData.msalTokenCache) {
          this.cca.getTokenCache().deserialize(this.sessionData.msalTokenCache)
        }

        console.log("✅ Microsoft session loaded from file")
      }
    } catch (error) {
      console.warn("⚠️ Could not load Microsoft session:", error)
      this.sessionData = {}
    }
  }

  // Save session data to file
  private saveSessionToFile() {
    try {
      const sessionPath = path.join(process.cwd(), ".microsoft-session.json")
      fs.writeFileSync(sessionPath, JSON.stringify(this.sessionData, null, 2))
      console.log("✅ Microsoft session saved to file")
    } catch (error) {
      console.error("❌ Failed to save Microsoft session:", error)
    }
  }

  // Get authorization URL - exactly like your working code
  async getAuthUrl(): Promise<string> {
    const authCodeUrlParameters = {
      scopes: GRAPH_SCOPES,
      redirectUri: REDIRECT_URI,
    }

    try {
      const authCodeUrl = await this.cca.getAuthCodeUrl(authCodeUrlParameters)
      console.log("🔗 Generated auth URL:", authCodeUrl)
      return authCodeUrl
    } catch (error) {
      console.error("❌ Could not generate auth URL:", error)
      throw new Error("Could not initiate login.")
    }
  }

  // Handle redirect and exchange code for tokens - exactly like your working code
  async handleRedirect(code: string): Promise<AuthenticationResult> {
    const tokenRequest = {
      code: code,
      scopes: GRAPH_SCOPES,
      redirectUri: REDIRECT_URI,
    }

    try {
      console.log("🔄 Exchanging code for tokens...")
      const response = await this.cca.acquireTokenByCode(tokenRequest)

      // Save session data exactly like your working code
      this.sessionData.msalTokenCache = this.cca.getTokenCache().serialize()
      this.sessionData.isAuthenticated = true
      this.sessionData.homeAccountId = response.account?.homeAccountId

      this.saveSessionToFile()

      console.log("✅ Authentication complete, user:", response.account?.username)
      return response
    } catch (error) {
      console.error("❌ Authentication failed:", error)
      throw new Error("Authentication failed.")
    }
  }

  // Get access token - exactly like your working code
  async getAccessToken(): Promise<string | null> {
    if (!this.sessionData.homeAccountId || !this.sessionData.isAuthenticated) {
      console.log("❌ No authenticated session found")
      return null
    }

    // Restore token cache
    if (this.sessionData.msalTokenCache) {
      this.cca.getTokenCache().deserialize(this.sessionData.msalTokenCache)
    }

    try {
      const account = await this.cca.getTokenCache().getAccountByHomeId(this.sessionData.homeAccountId)
      if (!account) {
        console.log("❌ No account found in cache")
        return null
      }

      console.log("🔄 Acquiring token silently...")
      const response = await this.cca.acquireTokenSilent({
        account,
        scopes: GRAPH_SCOPES,
      })

      // Update session cache
      this.sessionData.msalTokenCache = this.cca.getTokenCache().serialize()
      this.saveSessionToFile()

      console.log("✅ Token acquired successfully")
      return response.accessToken
    } catch (error) {
      console.error("❌ Silent token acquisition failed. Re-authentication may be required.", error)
      return null
    }
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.sessionData.isAuthenticated
  }

  // Check if configured
  isConfigured(): boolean {
    return !!(MSAL_CONFIG.auth.clientId && MSAL_CONFIG.auth.clientSecret)
  }

  // Clear session (logout)
  clearSession() {
    this.sessionData = {}
    try {
      const sessionPath = path.join(process.cwd(), ".microsoft-session.json")
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath)
      }
    } catch (error) {
      console.warn("Could not delete session file:", error)
    }
  }

  // Get session status
  getSessionStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isConfigured: this.isConfigured(),
      hasHomeAccountId: !!this.sessionData.homeAccountId,
      hasTokenCache: !!this.sessionData.msalTokenCache,
    }
  }
}

export const microsoftAuthMSAL = new MicrosoftAuthMSALService()

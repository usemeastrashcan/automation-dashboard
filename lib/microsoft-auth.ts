import fs from "fs"
import path from "path"

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope?: string
}

class MicrosoftAuthService {
  private clientId: string
  private clientSecret: string
  private tenantId: string
  private redirectUri: string
  private tokenCache: {
    accessToken?: string
    refreshToken?: string
    expiryTime?: number
  } = {}

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID || ""
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || ""
    // Use 'consumers' for personal accounts, 'common' for both personal and work accounts
    this.tenantId = process.env.MICROSOFT_TENANT_ID || "consumers"
    this.redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/microsoft/callback`

    // Load tokens from environment
    this.loadTokensFromEnv()
  }

  private loadTokensFromEnv() {
    this.tokenCache = {
      accessToken: process.env.MICROSOFT_ACCESS_TOKEN,
      refreshToken: process.env.MICROSOFT_REFRESH_TOKEN,
      expiryTime: Number.parseInt(process.env.MICROSOFT_TOKEN_EXPIRY || "0"),
    }
  }

  // Force reload tokens from environment (for when .env is updated)
  private reloadTokensFromEnv() {
    console.log("🔄 Reloading tokens from environment...")
    this.loadTokensFromEnv()
    console.log("✅ Tokens reloaded from environment")
  }

  // Clear all tokens and session data
  clearSession() {
    console.log("🔓 Clearing Microsoft session...")

    // Clear memory cache
    this.tokenCache = {}

    // Clear environment variables
    delete process.env.MICROSOFT_ACCESS_TOKEN
    delete process.env.MICROSOFT_REFRESH_TOKEN
    delete process.env.MICROSOFT_TOKEN_EXPIRY

    // Update .env file to remove tokens
    try {
      const envPath = path.join(process.cwd(), ".env")
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8")

        // Remove Microsoft token lines
        envContent = envContent
          .split("\n")
          .filter((line) => !line.startsWith("MICROSOFT_ACCESS_TOKEN="))
          .filter((line) => !line.startsWith("MICROSOFT_REFRESH_TOKEN="))
          .filter((line) => !line.startsWith("MICROSOFT_TOKEN_EXPIRY="))
          .join("\n")

        fs.writeFileSync(envPath, envContent)
        console.log("✅ Microsoft tokens removed from .env file")
      }
    } catch (error) {
      console.warn("⚠️ Could not update .env file:", error)
    }

    console.log("✅ Microsoft session cleared completely")
  }

  // Automatically update .env file with new tokens
  private async updateEnvFile(tokens: TokenData) {
    try {
      const envPath = path.join(process.cwd(), ".env")
      let envContent = ""

      // Read existing .env file
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8")
      }

      const newTokens = {
        MICROSOFT_ACCESS_TOKEN: tokens.access_token,
        MICROSOFT_REFRESH_TOKEN: tokens.refresh_token,
        MICROSOFT_TOKEN_EXPIRY: (Date.now() + tokens.expires_in * 1000).toString(),
      }

      // Update or add each token
      Object.entries(newTokens).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, "m")
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`)
        } else {
          envContent += `\n${key}=${value}`
        }
      })

      // Write back to .env file
      fs.writeFileSync(envPath, envContent.trim() + "\n")

      // Update process.env and cache immediately
      Object.entries(newTokens).forEach(([key, value]) => {
        process.env[key] = value
      })

      this.tokenCache = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryTime: Date.now() + tokens.expires_in * 1000,
      }

      console.log("✅ Microsoft tokens automatically updated in .env file and loaded into memory")
      return true
    } catch (error) {
      console.error("❌ Failed to update .env file:", error)
      return false
    }
  }

  // Get authorization URL with proper scopes for personal accounts
  getAuthUrl(): string {
    // Use more comprehensive scopes for Microsoft Graph
    const scopes = "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read offline_access"

    // Use consumers endpoint for personal Microsoft accounts
    const authority = this.tenantId === "consumers" ? "consumers" : this.tenantId

    const authUrl =
      `https://login.microsoftonline.com/${authority}/oauth2/v2.0/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_mode=query&` +
      `prompt=select_account` // Force account selection instead of consent

    return authUrl
  }

  // Exchange code for tokens (first time setup)
  async exchangeCodeForTokens(code: string): Promise<TokenData> {
    // Force consumers endpoint for personal accounts
    const authority = "consumers"
    const tokenUrl = `https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code",
      scope: "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read offline_access",
    })

    console.log("🔄 Exchanging authorization code for tokens...")
    console.log("🔗 Token URL:", tokenUrl)
    console.log("🔗 Redirect URI:", this.redirectUri)

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("❌ Token exchange failed:", error)
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokenData = await response.json()
    console.log("✅ Token exchange successful, scopes:", tokenData.scope)

    // Automatically update .env file and memory
    await this.updateEnvFile(tokenData)

    return tokenData
  }

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<TokenData> {
    // Always reload from environment first
    this.reloadTokensFromEnv()

    const refreshToken = this.tokenCache.refreshToken || process.env.MICROSOFT_REFRESH_TOKEN
    if (!refreshToken) {
      throw new Error("No refresh token available. Need to re-authenticate.")
    }

    // Force consumers endpoint for personal accounts
    const authority = "consumers"
    const tokenUrl = `https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read offline_access",
    })

    console.log("🔄 Refreshing Microsoft access token...")
    console.log("🔗 Token URL:", tokenUrl)

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("❌ Token refresh failed:", error)

      // If refresh fails, we need to re-authenticate
      throw new Error(`REAUTH_REQUIRED:${error}`)
    }

    const tokenData = await response.json()
    console.log("✅ Token refresh successful, scopes:", tokenData.scope)

    // Automatically update .env file and memory
    await this.updateEnvFile(tokenData)

    console.log("✅ Microsoft access token refreshed and saved automatically")
    return tokenData
  }

  // Test the token by making a simple Graph API call
  async testToken(accessToken: string): Promise<boolean> {
    try {
      console.log("🧪 Testing Microsoft Graph API token...")

      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("✅ Token test successful, user:", userData.displayName || userData.userPrincipalName)
        return true
      } else {
        const error = await response.text()
        console.error("❌ Token test failed:", response.status, error)
        return false
      }
    } catch (error) {
      console.error("❌ Token test error:", error)
      return false
    }
  }

  // Get valid access token with full automation
  async getValidAccessToken(): Promise<string> {
    // Always reload from environment first to get latest tokens
    this.reloadTokensFromEnv()

    const accessToken = this.tokenCache.accessToken || process.env.MICROSOFT_ACCESS_TOKEN
    const expiryTime = this.tokenCache.expiryTime || Number.parseInt(process.env.MICROSOFT_TOKEN_EXPIRY || "0")
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

    // Check if current token is still valid
    if (accessToken && Date.now() < expiryTime - bufferTime) {
      console.log("✅ Using existing Microsoft access token")

      // Test the token to make sure it actually works
      const isValid = await this.testToken(accessToken)
      if (isValid) {
        return accessToken
      } else {
        console.log("⚠️ Token exists but failed validation, attempting refresh...")
      }
    }

    console.log("⏰ Microsoft access token expired, invalid, or missing - attempting refresh...")

    try {
      // Try to refresh the token
      const tokenData = await this.refreshAccessToken()

      // Test the new token
      const isValid = await this.testToken(tokenData.access_token)
      if (!isValid) {
        throw new Error("New token failed validation")
      }

      return tokenData.access_token
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("REAUTH_REQUIRED")) {
        console.log("🔐 Refresh token expired, need to re-authenticate...")
        throw new Error(`REAUTH_REQUIRED: Please re-authenticate by visiting: ${this.getAuthUrl()}`)
      }

      throw error
    }
  }

  // Check if authentication is configured
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.tenantId)
  }

  // Check if tokens are available
  hasTokens(): boolean {
    // Always reload from environment first
    this.reloadTokensFromEnv()

    return !!(
      (this.tokenCache.refreshToken || process.env.MICROSOFT_REFRESH_TOKEN) &&
      (this.tokenCache.accessToken || process.env.MICROSOFT_ACCESS_TOKEN)
    )
  }

  // Get authentication status
  getAuthStatus() {
    // Always reload from environment first
    this.reloadTokensFromEnv()

    const hasValidToken =
      this.tokenCache.accessToken &&
      this.tokenCache.expiryTime &&
      Date.now() < this.tokenCache.expiryTime - 5 * 60 * 1000

    return {
      configured: this.isConfigured(),
      hasTokens: this.hasTokens(),
      hasValidToken,
      expiryTime: this.tokenCache.expiryTime ? new Date(this.tokenCache.expiryTime).toISOString() : null,
      needsReauth: !hasValidToken && !this.tokenCache.refreshToken,
      tokenInfo: {
        hasAccessToken: !!this.tokenCache.accessToken,
        hasRefreshToken: !!this.tokenCache.refreshToken,
        expiryTime: this.tokenCache.expiryTime,
        timeUntilExpiry: this.tokenCache.expiryTime ? this.tokenCache.expiryTime - Date.now() : 0,
      },
    }
  }

  // Force refresh tokens from environment (useful after .env updates)
  forceReloadTokens() {
    this.reloadTokensFromEnv()
  }
}

export const microsoftAuth = new MicrosoftAuthService()

import type { Configuration } from "@azure/msal-node"

export const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_APP_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/consumers`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_APP_CLIENT_SECRET || "",
  },
}

// Update the REDIRECT_URI to match exactly what's registered in your Azure portal
export const REDIRECT_URI = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/microsoft/callback`
export const POST_LOGOUT_REDIRECT_URI = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/microsoft/loggedout`
export const GRAPH_MAIL_ENDPOINT = "https://graph.microsoft.com/v1.0/me/messages"

export const GRAPH_SCOPES = ["User.Read", "Mail.Read", "offline_access"]

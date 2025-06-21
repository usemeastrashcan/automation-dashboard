"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react"

export default function SetupPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-zoho")
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: "Test failed", details: error })
    } finally {
      setTesting(false)
    }
  }

  const requiredScopes = [
    "ZohoCRM.modules.ALL",
    "ZohoCRM.settings.ALL",
    "ZohoCRM.coql.READ", // This is the missing scope
    "ZohoSign.documents.ALL",
    "ZohoSign.templates.ALL",
  ]

  const currentScopes = [
    "ZohoCRM.modules.ALL",
    "ZohoCRM.settings.ALL",
    "ZohoSign.documents.ALL",
    "ZohoSign.templates.ALL",
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Zoho CRM Setup</h1>
            <p className="text-muted-foreground mt-2">Configure your Zoho CRM integration for optimal performance</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                OAuth Scope Issue Detected
              </CardTitle>
              <CardDescription>
                Your current Zoho CRM authentication is missing the required scope for COQL queries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Current Scopes:</h3>
                <ul className="space-y-1">
                  {currentScopes.map((scope) => (
                    <li key={scope} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-amber-600">Missing Required Scope:</h3>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <code className="bg-gray-100 px-2 py-1 rounded">ZohoCRM.coql.READ</code>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">What is COQL?</h4>
                <p className="text-blue-700 text-sm">
                  COQL (CRM Object Query Language) allows efficient querying of large datasets. With 28,000+ leads, COQL
                  provides much better performance than the standard REST API.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solution Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-700 text-lg">Option 1: Re-authenticate (Recommended)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Re-authenticate with Zoho to include the COQL scope for optimal performance.
                    </p>
                    <Button className="w-full" onClick={() => window.open("/auth/zoho", "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Re-authenticate with Zoho
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">This will open a new window for Zoho authentication</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-700 text-lg">Option 2: Use REST API Fallback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Continue with the current setup. The app will automatically use REST API instead of COQL.
                    </p>
                    <Button variant="outline" className="w-full" onClick={testConnection} disabled={testing}>
                      {testing ? "Testing..." : "Test Current Setup"}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">Performance may be slower with large datasets</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle>Connection Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Manual Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">If you prefer to update your existing authentication:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Update your authentication URL to include the COQL scope:</li>
                  <li className="ml-4">
                    <code className="bg-gray-100 p-2 rounded block text-xs break-all">
                      {process.env.NEXT_PUBLIC_ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com"}
                      /oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.coql.READ,ZohoSign.documents.ALL,ZohoSign.templates.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=YOUR_REDIRECT_URI
                    </code>
                  </li>
                  <li>Complete the OAuth flow to get new tokens</li>
                  <li>Update your environment variables with the new tokens</li>
                </ol>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables Configuration</CardTitle>
              <CardDescription>Configure all required environment variables for the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Required Environment Variables:</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">OPENAI_API_KEY</code>
                    <span className="text-gray-600">- Your OpenAI API key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">OPENAI_ASSISTANT_ID</code>
                    <span className="text-gray-600">- Your OpenAI Assistant ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">ZAPIER_EMAIL_WEBHOOK_URL</code>
                    <span className="text-gray-600">- Your Zapier webhook URL for sending emails</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">SENDER_NAME</code>
                    <span className="text-gray-600">- Name to use in emails (default: "Rian Patel")</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">COMPANY_NAME</code>
                    <span className="text-gray-600">- Company name for emails (default: "Forbes Burton")</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Setup Instructions:</h4>
                <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Create an OpenAI account and get your API key</li>
                  <li>Create an Assistant in the OpenAI platform</li>
                  <li>Upload the lead_fresh_email_template.pdf file to your Assistant</li>
                  <li>Enable file_search capability for your Assistant</li>
                  <li>Set up a Zapier webhook for email sending (format: To, Subject, Body)</li>
                  <li>Configure all environment variables in your .env file</li>
                  <li>The system will use dynamic values instead of hardcoded data</li>
                </ol>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Microsoft Graph API Configuration (Optional)</CardTitle>
              <CardDescription>Configure email search functionality to check for lead responses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Required Environment Variables:</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">MICROSOFT_CLIENT_ID</code>
                    <span className="text-gray-600">- Azure App Registration Client ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">MICROSOFT_CLIENT_SECRET</code>
                    <span className="text-gray-600">- Azure App Registration Client Secret</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">MICROSOFT_TENANT_ID</code>
                    <span className="text-gray-600">- Azure Tenant ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">NEXTAUTH_URL</code>
                    <span className="text-gray-600">- Your app URL (default: http://localhost:3000)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Email Search Features:</h4>
                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                  <li>Search for emails from specific leads</li>
                  <li>Natural language time filtering ("last Thursday", "yesterday")</li>
                  <li>Check for responses to sent emails</li>
                  <li>Integrated with the AI chatbot</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Button onClick={() => window.open("/api/auth/microsoft", "_blank")} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Setup Microsoft Graph API
                </Button>
                <p className="text-xs text-gray-500">This will guide you through the authentication process</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

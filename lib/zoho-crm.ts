// Types and Interfaces
export interface ZohoTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  api_domain: string
}

export interface ZohoLead {
  id: string
  First_Name?: string
  Last_Name: string
  Email?: string
  Company: string
  Phone?: string
  Lead_Status?: string
  Activity?: string
  Created_Time: string
  Modified_Time: string
  cf_Thread_ID?: string
}

export interface ZohoTask {
  id: string
  Subject: string
  Description?: string
  Due_Date: string
  Priority?: string
  Status: string
  Owner: {
    id: string
    name: string
  }
  What_Id?: string // Related Lead ID
  Who_Id?: string // Contact ID
  Created_Time: string
  Modified_Time: string
  Closed_Time?: string
}

// Activity to Kanban Column Mapping
export const ACTIVITY_MAPPING = {
  leads: ["Fresh", "Attempting to make contact with lead"],
  questionnaire: [
    "Questionnaire Sent",
    "Questionnaire Chasing",
    "Questionnaire Final Chase",
    "Questionnaire Received, Awaiting Assessment",
  ],
  quotation: [
    "Informal Quote Given, Awaiting Response",
    "Quote Given, Awaiting Response",
    "Awaiting Client Instruction",
    "MVL Quote Sent",
  ],
  "details-passed": ["Details Passed To Relevant People For Contact", "See Case Notes"],
  "lost-cases": ["Lost Lead", "Lost Potential", "Lost Client", "DO NOT CONTACT", "REJECTED"],
  others: ["Inactive/Slow Engage", "Future Lead", "Telesales", "Zoho Campaigns"],
}

// Enhanced token cache with better performance
class TokenCache {
  private static instance: TokenCache
  private cachedToken: string | null = null
  private tokenExpiry = 0
  private refreshPromise: Promise<string> | null = null

  static getInstance(): TokenCache {
    if (!TokenCache.instance) {
      TokenCache.instance = new TokenCache()
    }
    return TokenCache.instance
  }

  setToken(token: string, expiresIn: number): void {
    this.cachedToken = token
    this.tokenExpiry = Date.now() + expiresIn * 1000
    console.log(`Token cached, expires in ${Math.round(expiresIn / 60)} minutes`)
  }

  getToken(): string | null {
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
    if (this.cachedToken && Date.now() < this.tokenExpiry - bufferTime) {
      return this.cachedToken
    }
    return null
  }

  isValid(): boolean {
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
    return this.cachedToken !== null && Date.now() < this.tokenExpiry - bufferTime
  }

  clear(): void {
    this.cachedToken = null
    this.tokenExpiry = 0
    this.refreshPromise = null
  }

  // Prevent multiple simultaneous refresh attempts
  async getOrRefreshToken(refreshFn: () => Promise<string>): Promise<string> {
    const existingToken = this.getToken()
    if (existingToken) {
      return existingToken
    }

    if (this.refreshPromise) {
      return await this.refreshPromise
    }

    this.refreshPromise = refreshFn()
    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.refreshPromise = null
    }
  }
}

// Token manager with proper error handling
class TokenManager {
  private static instance: TokenManager
  private lastRefreshAttempt = 0
  private consecutiveFailures = 0
  private readonly backoffDelays = [30000, 60000, 120000] // 30s, 1m, 2m
  private tokenCache = TokenCache.getInstance()

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  private getBackoffDelay(): number {
    const delayIndex = Math.min(this.consecutiveFailures, this.backoffDelays.length - 1)
    return this.backoffDelays[delayIndex]
  }

  private shouldAttemptRefresh(): boolean {
    const now = Date.now()
    const timeSinceLastAttempt = now - this.lastRefreshAttempt
    const requiredDelay = this.getBackoffDelay()
    return timeSinceLastAttempt >= requiredDelay
  }

  async refreshToken(
    refreshToken: string,
    accountsUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    return await this.tokenCache.getOrRefreshToken(async () => {
      if (!this.shouldAttemptRefresh()) {
        const waitTime = this.getBackoffDelay() - (Date.now() - this.lastRefreshAttempt)
        throw new Error(`Token refresh rate limited. Please wait ${Math.ceil(waitTime / 60000)} minutes.`)
      }

      return await this.performRefresh(refreshToken, accountsUrl, clientId, clientSecret)
    })
  }

  private async performRefresh(
    refreshToken: string,
    accountsUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const tokenUrl = `${accountsUrl}/oauth/v2/token`
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    })

    console.log(`Attempting token refresh...`)
    this.lastRefreshAttempt = Date.now()

    const response = await fetch(tokenUrl, {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    if (!response.ok) {
      this.consecutiveFailures++
      const errorData = await response.text()
      console.error(`Token refresh failed: ${response.status} - ${errorData}`)

      if (response.status === 429 || errorData.includes("too many requests")) {
        throw new Error("Zoho API rate limit reached. Please wait before retrying.")
      }
      throw new Error(`Token refresh failed: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    this.consecutiveFailures = 0

    // Cache the new token
    this.tokenCache.setToken(data.access_token, data.expires_in)
    console.log(`Token refreshed successfully, valid for ${Math.round(data.expires_in / 3600)} hours`)

    return data.access_token
  }

  getTokenStatus() {
    return {
      consecutiveFailures: this.consecutiveFailures,
      nextAttemptIn: Math.max(0, this.getBackoffDelay() - (Date.now() - this.lastRefreshAttempt)),
      isInBackoff: !this.shouldAttemptRefresh(),
      hasValidToken: this.tokenCache.isValid(),
    }
  }
}

// Request cache with spam prevention
class RequestCache {
  private static instance: RequestCache
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private failedRequests = new Map<string, { count: number; lastAttempt: number }>()
  private readonly DEFAULT_TTL = 2 * 60 * 1000 // 2 minutes
  private readonly FAILED_REQUEST_COOLDOWN = 30 * 1000 // 30 seconds
  private readonly MAX_FAILED_ATTEMPTS = 3

  static getInstance(): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache()
    }
    return RequestCache.instance
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })

    // Clean up old entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey!)
    }
  }

  shouldAllowRequest(key: string): boolean {
    const failed = this.failedRequests.get(key)
    if (!failed) return true

    const now = Date.now()
    const timeSinceLastAttempt = now - failed.lastAttempt

    if (failed.count >= this.MAX_FAILED_ATTEMPTS && timeSinceLastAttempt < this.FAILED_REQUEST_COOLDOWN) {
      console.log(`Request blocked for ${key}: ${failed.count} failures, cooldown active`)
      return false
    }

    return true
  }

  recordFailure(key: string): void {
    const failed = this.failedRequests.get(key) || { count: 0, lastAttempt: 0 }
    failed.count++
    failed.lastAttempt = Date.now()
    this.failedRequests.set(key, failed)
  }

  recordSuccess(key: string): void {
    this.failedRequests.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.failedRequests.clear()
  }
}

// Main Zoho CRM Service Class
export class ZohoCRMService {
  private baseUrl: string
  private accountsUrl: string
  private clientId: string
  private clientSecret: string
  private tokenManager: TokenManager
  private tokenCache = TokenCache.getInstance()
  private requestCache = RequestCache.getInstance()
  private requestQueue: Promise<any> = Promise.resolve()

  constructor() {
    this.baseUrl = process.env.ZOHO_API_BASE_URL || ""
    this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com"
    this.clientId = process.env.ZOHO_CLIENT_ID || ""
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || ""
    this.tokenManager = TokenManager.getInstance()

    // Validate required environment variables
    if (!this.baseUrl) {
      console.error("ZOHO_API_BASE_URL is not set")
    }
    if (!this.clientId || !this.clientSecret) {
      console.error("ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET is not set")
    }
  }

  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const currentRequest = this.requestQueue.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return await requestFn()
    })

    this.requestQueue = currentRequest.catch(() => {})
    return currentRequest
  }

  async getValidAccessToken(): Promise<string> {
    // Check in-memory cache first
    const cachedToken = this.tokenCache.getToken()
    if (cachedToken) {
      return cachedToken
    }

    // Check environment variable
    const accessToken = process.env.ZOHO_ACCESS_TOKEN
    const expiryTime = Number.parseInt(process.env.ZOHO_TOKEN_EXPIRY_TIME || "0", 10)
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
    const isTokenExpired = !accessToken || Date.now() >= expiryTime - bufferTime

    if (!isTokenExpired) {
      const remainingTime = Math.max(0, (expiryTime - Date.now()) / 1000)
      this.tokenCache.setToken(accessToken, remainingTime)
      return accessToken
    }

    // Token expired, attempt refresh
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    if (!refreshToken) {
      throw new Error("No refresh token available. Please check Zoho CRM authentication.")
    }

    try {
      const newToken = await this.tokenManager.refreshToken(
        refreshToken,
        this.accountsUrl,
        this.clientId,
        this.clientSecret,
      )
      return newToken
    } catch (error) {
      console.error("Token refresh failed:", error)
      throw error
    }
  }

  private async safeJsonParse(response: Response): Promise<any> {
    const text = await response.text()

    if (!text || text.trim() === "") {
      console.warn("Empty response from Zoho API")
      return { data: [], info: {} }
    }

    try {
      return JSON.parse(text)
    } catch (error) {
      console.error("JSON parse error:", text.substring(0, 200))
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Get leads with REST API
  async getLeadsREST(page = 1, limit = 100): Promise<any> {
    const cacheKey = `leads_rest_${page}_${limit}`

    // Check cache first
    const cached = this.requestCache.get(cacheKey)
    if (cached) {
      console.log(`Using cached leads for page ${page}`)
      return cached
    }

    // Check if request should be allowed
    if (!this.requestCache.shouldAllowRequest(cacheKey)) {
      throw new Error("Too many failed requests. Please wait before retrying.")
    }

    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken()
        const url = `${this.baseUrl}/Leads`

        const params = new URLSearchParams({
          fields: "id,First_Name,Last_Name,Email,Company,Phone,Lead_Status,Activity,Created_Time,Modified_Time",
          page: page.toString(),
          per_page: Math.min(limit, 200).toString(),
          sort_order: "desc",
          sort_by: "Created_Time",
        })

        console.log(`REST API: Fetching leads (page ${page}, limit ${limit})`)

        const response = await fetch(`${url}?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`REST API Error: ${response.status} - ${errorText}`)
          this.requestCache.recordFailure(cacheKey)
          throw new Error(`REST API failed: ${response.status} ${response.statusText}`)
        }

        const result = await this.safeJsonParse(response)
        const finalResult = {
          data: result.data || [],
          info: result.info || {},
          hasMore: result.info?.more_records === true,
        }

        console.log(`REST API: Got ${finalResult.data.length} leads`)

        // Cache successful result
        this.requestCache.set(cacheKey, finalResult)
        this.requestCache.recordSuccess(cacheKey)

        return finalResult
      } catch (error) {
        this.requestCache.recordFailure(cacheKey)
        throw error
      }
    })
  }

  // Search leads with spam prevention
  async searchLeadsREST(searchTerm: string, page = 1, limit = 100): Promise<any> {
    const cacheKey = `search_${searchTerm}_${page}_${limit}`

    // Check cache first
    const cached = this.requestCache.get(cacheKey)
    if (cached) {
      console.log(`Using cached search results for "${searchTerm}"`)
      return cached
    }

    // Check if request should be allowed (spam prevention)
    if (!this.requestCache.shouldAllowRequest(cacheKey)) {
      console.log(`Search blocked for "${searchTerm}" due to repeated failures`)
      return {
        data: [],
        info: { count: 0, more_records: false },
        hasMore: false,
      }
    }

    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken()
        const url = `${this.baseUrl}/Leads/search`

        // Build search criteria
        const isNumeric = /^\d+$/.test(searchTerm.replace(/[\s\-+()]/g, ""))
        const isEmail = searchTerm.includes("@")

        let criteria = ""
        if (isEmail) {
          criteria = `(Email:equals:${searchTerm})`
        } else if (isNumeric) {
          criteria = `(Phone:equals:${searchTerm})`
        } else {
          const words = searchTerm.trim().split(/\s+/)
          const firstWord = words[0]
          criteria = `((First_Name:starts_with:${firstWord}) or (Last_Name:starts_with:${firstWord}) or (Company:starts_with:${firstWord}))`
        }

        const params = new URLSearchParams({
          criteria,
          fields: "id,First_Name,Last_Name,Email,Company,Phone,Lead_Status,Activity,Created_Time,Modified_Time",
          page: page.toString(),
          per_page: Math.min(limit, 200).toString(),
          sort_order: "desc",
          sort_by: "Created_Time",
        })

        console.log(`REST API Search: "${searchTerm}" (page ${page})`)

        const response = await fetch(`${url}?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`REST API Search Error: ${response.status} - ${errorText}`)

          if (response.status === 400 || response.status === 404) {
            console.log(`No search results found for: "${searchTerm}"`)
            const emptyResult = {
              data: [],
              info: { count: 0, more_records: false },
              hasMore: false,
            }

            // Cache empty result to prevent spam
            this.requestCache.set(cacheKey, emptyResult, 60000) // 1 minute cache for empty results
            return emptyResult
          }

          this.requestCache.recordFailure(cacheKey)
          throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const result = await this.safeJsonParse(response)

        // Deduplicate by ID
        const uniqueLeads = new Map()
        if (result.data) {
          result.data.forEach((lead: any) => {
            uniqueLeads.set(lead.id, lead)
          })
        }

        const finalResult = {
          data: Array.from(uniqueLeads.values()),
          info: result.info || { count: uniqueLeads.size, more_records: false },
          hasMore: result.info?.more_records === true,
        }

        console.log(`REST API Search: Found ${finalResult.data.length} unique leads for "${searchTerm}"`)

        // Cache successful result
        this.requestCache.set(cacheKey, finalResult)
        this.requestCache.recordSuccess(cacheKey)

        return finalResult
      } catch (error) {
        this.requestCache.recordFailure(cacheKey)

        // Return empty result instead of throwing to prevent spam
        const errorResult = {
          data: [],
          info: { count: 0, more_records: false },
          hasMore: false,
        }

        // Cache error result briefly
        this.requestCache.set(cacheKey, errorResult, 10000) // 10 second cache for errors
        return errorResult
      }
    })
  }

  // Get lead by ID
  async getLeadById(leadId: string): Promise<any> {
    if (!leadId || typeof leadId !== "string" || leadId.trim() === "") {
      return null
    }

    const cleanLeadId = leadId.trim()
    const cacheKey = `lead_${cleanLeadId}`

    const cached = this.requestCache.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const accessToken = await this.getValidAccessToken()
      const url = `${this.baseUrl}/Leads/${cleanLeadId}`

      const params = new URLSearchParams({
        fields:
          "id,First_Name,Last_Name,Email,Company,Phone,Lead_Status,Activity,Created_Time,Modified_Time,cf_Thread_ID",
      })

      const response = await fetch(`${url}?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          this.requestCache.set(cacheKey, null)
          return null
        }
        throw new Error(`Failed to get lead: ${response.status} ${response.statusText}`)
      }

      const result = await this.safeJsonParse(response)
      const lead = result.data?.[0]

      if (!lead) {
        this.requestCache.set(cacheKey, null)
        return null
      }

      const transformedLead = {
        id: lead.id,
        name: `${lead.First_Name || ""} ${lead.Last_Name || ""}`.trim() || "Unknown",
        company: lead.Company || "Unknown Company",
        email: lead.Email || "",
        phone: lead.Phone,
        Activity: lead.Activity,
        cf_Thread_ID: lead.cf_Thread_ID,
      }

      this.requestCache.set(cacheKey, transformedLead)
      return transformedLead
    } catch (error) {
      console.error("Get lead by ID error:", error)
      return null
    }
  }

  // Update lead thread ID
  async updateLeadThreadId(leadId: string, threadId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken()
    const url = `${this.baseUrl}/Leads/${leadId}`

    console.log(`Updating lead ${leadId} with thread ID: ${threadId}`)

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [{ id: leadId, cf_Thread_ID: threadId }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Update thread ID error: ${response.status} - ${errorText}`)
      throw new Error(`Failed to update thread ID: ${response.status} ${response.statusText}`)
    }

    // Clear cache for this lead
    this.requestCache.clear()
    console.log(`Successfully updated lead ${leadId} with thread ID`)
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getLeadsREST(1, 1)
      return true
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  // Get token status
  getTokenStatus() {
    return this.tokenManager.getTokenStatus()
  }

  // Get users (placeholder - implement if needed)
async getUsers(): Promise<any[]> {
  const accessToken = await this.getValidAccessToken()
  const url = `${this.baseUrl}/users`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Failed to fetch users: ${response.status} - ${errorText}`)
    throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`)
  }

  const result = await this.safeJsonParse(response)
  return result.users || result.data || []
}


async getTasks(filters: { ownerId?: string; page?: number; limit?: number } = {}): Promise<any> {
  const { ownerId, page = 1, limit = 100 } = filters
  const accessToken = await this.getValidAccessToken()
  const url = `${this.baseUrl}/Tasks/search`

  // Build criteria string
  let criteria = ""
  if (ownerId) {
    criteria = `(Owner.id:equals:${ownerId})`
  }

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: Math.min(limit, 200).toString(),
    fields: "id,Subject,Description,Due_Date,Status,Priority,Owner,Created_Time,Modified_Time,What_Id,Who_Id,Closed_Time",
    sort_by: "Due_Date",
    sort_order: "desc",
  })

  if (criteria) {
    params.set("criteria", criteria)
  }

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Task fetch error: ${response.status} - ${errorText}`)
    throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`)
  }

  const result = await this.safeJsonParse(response)

  return {
    data: result.data || [],
    hasMore: result.info?.more_records || false,
  }
}


  // Update task status (placeholder - implement if needed)
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    // Implementation would go here
  }
}

// Export singleton instance
export const zohoCRM = new ZohoCRMService()

// Export default
export default zohoCRM

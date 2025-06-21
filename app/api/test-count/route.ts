import { NextResponse } from "next/server"
import { zohoCRM } from "@/lib/zoho-crm"

export async function GET() {
  const testQueries = [
    "select COUNT() from Leads limit 1",
    "select count(*) from Leads limit 1",
    "select count(id) from Leads limit 1",
    "select COUNT(id) from Leads limit 1",
    "select COUNT(*) from Leads limit 1",
  ]

  const results = []

  for (const query of testQueries) {
    try {
      console.log(`Testing query: ${query}`)
      const result = await zohoCRM.executeCoqlQuery(query)
      results.push({
        query,
        success: true,
        result: result.data?.[0] || result.data,
        fullResponse: result,
      })
    } catch (error) {
      results.push({
        query,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}

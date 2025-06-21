import { zohoCRM } from "./zoho-crm"

export async function updateLeadField(leadId: string, fieldName: string, fieldValue: string) {
  try {
    console.log(`Updating lead ${leadId} field ${fieldName} to ${fieldValue}`)

    // Use the existing Zoho CRM service to update the lead
    const accessToken = await zohoCRM.getValidAccessToken()
    const url = `${process.env.ZOHO_API_BASE_URL}/Leads/${leadId}`

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            id: leadId,
            [fieldName]: fieldValue,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update lead field: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log(`Successfully updated lead ${leadId} field ${fieldName}`)
    return result
  } catch (error) {
    console.error(`Error updating lead field:`, error)
    throw error
  }
}

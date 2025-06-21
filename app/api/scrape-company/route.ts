import { NextResponse } from "next/server"
import { ensureAuthenticated } from "@/lib/auth-middleware"
import puppeteer from "puppeteer"

/**
 * Normalizes a company name for comparison.
 * Converts to lowercase and removes common suffixes like LTD, LIMITED, PLC, LLP.
 */
function normalizeCompanyName(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/\s*ltd\.?$/, "")
    .replace(/\s*limited\.?$/, "")
    .replace(/\s*plc\.?$/, "")
    .replace(/\s*llp\.?$/, "")
    .replace(/[^\w\s]/gi, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

/**
 * Launches a browser instance.
 */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true, // Set to true for production
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
}

/**
 * Extracts officer details from the current page.
 */
async function extractOfficerDetails(page: any, identifier: string) {
  // Check if the appointments list container exists
  const appointmentsListExists = await page.$("#content-container > div.govuk-tabs > div > div.appointments-list")
  if (!appointmentsListExists) {
    console.warn(`No appointments list found on the officers page for ${identifier}.`)
    const pageContent = await page.content()
    if (
      pageContent.includes("There are no current officers for this company") ||
      pageContent.includes("no current appointments")
    ) {
      return { message: `There are no current officers listed for ${identifier}.` }
    }
    return {
      message: `No officers found for ${identifier}, or the page structure is unexpected on the officers page.`,
    }
  }

  const officers = await page.$$eval(
    '#content-container > div.govuk-tabs > div > div.appointments-list > div[class*="appointment-"]',
    (appointments: any[]) => {
      return appointments.map((appointment, index) => {
        const officerIndex = index + 1 // Officer indices are 1-based in IDs

        const getText = (element: any, selector: string) => {
          const el = element.querySelector(selector)
          return el ? el.innerText.trim() : null
        }

        const getDlData = (element: any, dtText: string) => {
          if (!element) return null
          const dts = Array.from(element.querySelectorAll("dt"))
          const dtElement = dts.find((dt: any) => dt.innerText.trim().toLowerCase() === dtText.toLowerCase())
          if (dtElement && dtElement.nextElementSibling && dtElement.nextElementSibling.tagName === "DD") {
            return dtElement.nextElementSibling.innerText.trim()
          }
          return null
        }

        const nameElement =
          appointment.querySelector(`#officer-name-${officerIndex} a`) ||
          appointment.querySelector(`#officer-name-${officerIndex}`)
        const name = nameElement ? nameElement.innerText.trim() : getText(appointment, "h2.heading-medium > span")
        const correspondenceAddress = getText(appointment, `#officer-address-value-${officerIndex}`)

        const detailRows = appointment.querySelectorAll(":scope > div.grid-row")
        let role = getText(appointment, `#officer-role-${officerIndex}`)
        let status = getText(appointment, `#officer-status-tag-${officerIndex}`)
        let dateOfBirth = null
        let appointedOn = null
        let nationality = getText(appointment, `#officer-nationality-${officerIndex}`)
        let countryOfResidence = getText(appointment, `#officer-country-of-residence-${officerIndex}`)
        let occupation = getText(appointment, `#officer-occupation-${officerIndex}`)

        detailRows.forEach((row: any) => {
          if (!role) role = getDlData(row, "Role")
          if (!status) status = getDlData(row, "Status")
          if (!dateOfBirth) dateOfBirth = getDlData(row, "Date of birth")
          if (!appointedOn) appointedOn = getDlData(row, "Appointed on")
          if (!nationality) nationality = getDlData(row, "Nationality")
          if (!countryOfResidence) countryOfResidence = getDlData(row, "Country of residence")
          if (!occupation) occupation = getDlData(row, "Occupation")
        })

        // Fallbacks using more specific container logic
        const detailsContainer1 = appointment.querySelector(
          ":scope > div.grid-row:nth-of-type(1), :scope > div:nth-child(3)",
        )
        const detailsContainer2 = appointment.querySelector(
          ":scope > div.grid-row:nth-of-type(2), :scope > div:nth-child(4)",
        )

        if (detailsContainer1) {
          if (!role) role = getDlData(detailsContainer1.querySelector("dl:nth-of-type(1)"), "Role")
          if (!status && detailsContainer1.querySelector("dl:nth-of-type(1) #officer-status-tag-" + officerIndex)) {
            status = getText(
              detailsContainer1.querySelector("dl:nth-of-type(1)"),
              "#officer-status-tag-" + officerIndex,
            )
          } else if (!status) {
            status =
              getDlData(detailsContainer1.querySelector("dl:nth-of-type(1)"), "Status") ||
              getText(appointment, `#officer-status-tag-${officerIndex}`)
          }
          if (!dateOfBirth)
            dateOfBirth = getDlData(detailsContainer1.querySelector("dl:nth-of-type(2)"), "Date of birth")
          if (!appointedOn)
            appointedOn = getDlData(detailsContainer1.querySelector("dl:nth-of-type(3)"), "Appointed on")
        }

        if (detailsContainer2) {
          if (!nationality) nationality = getDlData(detailsContainer2.querySelector("dl:nth-of-type(1)"), "Nationality")
          if (!countryOfResidence)
            countryOfResidence = getDlData(detailsContainer2.querySelector("dl:nth-of-type(2)"), "Country of residence")
          if (!occupation) occupation = getDlData(detailsContainer2.querySelector("dl:nth-of-type(3)"), "Occupation")
        }

        return {
          name,
          correspondenceAddress,
          role,
          status,
          dateOfBirth,
          appointedOn,
          nationality,
          countryOfResidence,
          occupation,
        }
      })
    },
  )

  if (officers.length === 0) {
    return {
      message: `No officers parsed from appointments list for ${identifier}, though the list container was found.`,
    }
  }
  return officers
}

/**
 * Scrapes officer details for a given company number.
 */
async function scrapeCompanyOfficersByNumber(companyNumber: string) {
  let browser = null
  try {
    console.log(`Launching browser for company number: ${companyNumber}`)
    browser = await launchBrowser()
    const page = await browser.newPage()

    const url = `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/officers`
    console.log(`Navigating to URL: ${url}`)

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 })
    } catch (e: any) {
      if (e.message.includes("net::ERR_NAME_NOT_RESOLVED") || e.message.includes("Timeout")) {
        console.warn(
          `Failed to navigate to officers page for ${companyNumber}. It might be an invalid number or network issue.`,
        )
        const pageContentCheck = await page.content().catch(() => "")
        if (
          pageContentCheck.includes("Company number not found") ||
          pageContentCheck.includes("company information is not available")
        ) {
          await browser.close()
          return {
            message: `Company number ${companyNumber} not found or information is not available (navigation error).`,
          }
        }
        await browser.close()
        return {
          message: `Could not reach officers page for company number ${companyNumber}. It may be invalid or a network issue.`,
        }
      }
      throw e
    }
    console.log("Page loaded. Starting to scrape officer details...")

    // Check for "Company not found" messages on the page itself
    const pageContent = await page.content()
    if (
      pageContent.includes("Company number not found") ||
      pageContent.includes("company information is not available")
    ) {
      await browser.close()
      return { message: `Company number ${companyNumber} not found or information is not available.` }
    }

    const result = await extractOfficerDetails(page, `company number ${companyNumber}`)

    await browser.close()
    console.log("Browser closed.")
    return result
  } catch (error: any) {
    console.error(`Error during scraping for company number ${companyNumber}:`, error)
    if (browser) await browser.close()
    throw new Error(`Scraping by number failed: ${error.message}`)
  }
}

/**
 * Scrapes officer details for a given company name.
 */
async function scrapeCompanyOfficersByName(companyNameInput: string) {
  let browser = null
  try {
    console.log(`Launching browser for company name: ${companyNameInput}`)
    browser = await launchBrowser()
    const page = await browser.newPage()

    const formattedCompanyNameQuery = encodeURIComponent(companyNameInput.trim())
    const searchUrl = `https://find-and-update.company-information.service.gov.uk/search?q=${formattedCompanyNameQuery}`
    console.log(`Navigating to search URL: ${searchUrl}`)
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 })

    // Check if search yielded any results at all
    const noResultsSelector = ".govuk-warning-text__text strong, #results p.govuk-body"
    const noResultsElement = await page.$(noResultsSelector)
    if (noResultsElement) {
      const noResultsText = await page.evaluate((el: any) => el.innerText, noResultsElement)
      if (
        noResultsText.toLowerCase().includes("no results for your search") ||
        noResultsText.toLowerCase().includes("no companies found")
      ) {
        console.warn(`No search results found on page for company name "${companyNameInput}".`)
        await browser.close()
        return { message: `No search results found for company name "${companyNameInput}".` }
      }
    }

    const firstResultSelector = "#results > li:nth-child(1) > h3 > a"
    const firstResultNameSelector = "#results > li:nth-child(1) > h3 > a"
    console.log("Search page loaded. Looking for the first result link and name...")

    let firstResultNameText
    try {
      await page.waitForSelector(firstResultSelector, { timeout: 10000 })
      firstResultNameText = await page.$eval(firstResultNameSelector, (el: any) => el.innerText.trim())
    } catch (e) {
      console.warn(`First search result link/name not found for "${companyNameInput}".`)
      const bodyText = await page.$eval("body", (body: any) => body.innerText.toLowerCase())
      if (bodyText.includes("no results for your search") || bodyText.includes("no companies found")) {
        await browser.close()
        return { message: `No search results found for company name "${companyNameInput}".` }
      }
      await browser.close()
      return { message: `Could not find the first search result for company name "${companyNameInput}".` }
    }

    console.log(`Found first result: Name on page is "${firstResultNameText}"`)

    // Normalize names for comparison
    const normalizedInputName = normalizeCompanyName(companyNameInput)
    const normalizedResultName = normalizeCompanyName(firstResultNameText)

    console.log(`Normalized Input Name: "${normalizedInputName}", Normalized Result Name: "${normalizedResultName}"`)

    if (normalizedInputName !== normalizedResultName) {
      // Allow for partial match if the result name starts with the input name
      if (!normalizedResultName.startsWith(normalizedInputName)) {
        console.warn(`Exact name match failed. Input: "${companyNameInput}", Found: "${firstResultNameText}".`)
        await browser.close()
        return {
          message: `No exact match found for company name "${companyNameInput}". First result was "${firstResultNameText}".`,
        }
      }
      console.log("Partial match accepted (result starts with input). Proceeding with scraping.")
    } else {
      console.log("Exact name match successful.")
    }

    console.log("First result link found and name matched. Clicking and waiting for navigation...")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.click(firstResultSelector),
    ])

    const companyPageUrl = page.url()
    console.log(`Navigated to company page: ${companyPageUrl}`)

    const companyNumberMatch = companyPageUrl.match(/\/company\/([A-Za-z0-9]+)/)
    if (!companyNumberMatch || !companyNumberMatch[1]) {
      console.error("Could not extract company number from URL:", companyPageUrl)
      await browser.close()
      return { message: "Failed to identify company number after search." }
    }
    const companyNumber = companyNumberMatch[1]
    console.log(`Extracted company number: ${companyNumber}`)

    const officersUrl = `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/officers`
    console.log(`Navigating to officers page: ${officersUrl}`)
    await page.goto(officersUrl, { waitUntil: "networkidle2", timeout: 60000 })

    console.log("Officers page loaded. Starting to scrape officer details...")
    const result = await extractOfficerDetails(
      page,
      `company name "${companyNameInput}" (matched as "${firstResultNameText}", number ${companyNumber})`,
    )

    await browser.close()
    console.log("Browser closed.")
    return result
  } catch (error: any) {
    console.error(`Error during scraping for company name "${companyNameInput}":`, error)
    if (browser) await browser.close()
    throw new Error(`Scraping by name failed: ${error.message}`)
  }
}

export async function POST(request: Request) {
  // Check authentication
  const authError = await ensureAuthenticated()
  if (authError) return authError

  try {
    const { queryInput } = await request.json()

    if (!queryInput || String(queryInput).trim() === "") {
      return NextResponse.json({ error: "Query input (company number or name) is required." }, { status: 400 })
    }

    let scrapedData
    const trimmedInput = String(queryInput).trim()

    // Determine if the input is a company number or a company name
    const isLikelyCompanyNumber = /^[0-9]{6,8}$/.test(trimmedInput) || /^[A-Za-z]{2}[0-9]{6}$/.test(trimmedInput)

    if (isLikelyCompanyNumber) {
      console.log(`Received request to scrape by likely company number: ${trimmedInput}`)
      scrapedData = await scrapeCompanyOfficersByNumber(trimmedInput)
    } else {
      console.log(`Received request to scrape by company name: ${trimmedInput}`)
      scrapedData = await scrapeCompanyOfficersByName(trimmedInput)
    }

    // If data was scraped successfully (and is an array of officers), send it back as JSON
    if (Array.isArray(scrapedData) && scrapedData.length > 0) {
      return NextResponse.json({
        success: true,
        officers: scrapedData,
        companyIdentifier: trimmedInput,
      })
    } else if (scrapedData && scrapedData.message) {
      // Handle specific messages from scraper
      let statusCode = 200
      if (
        scrapedData.message.toLowerCase().includes("not found") ||
        scrapedData.message.toLowerCase().includes("no match") ||
        scrapedData.message.toLowerCase().includes("no search results")
      ) {
        statusCode = 404
      }
      return NextResponse.json({ success: false, message: scrapedData.message }, { status: statusCode })
    } else {
      return NextResponse.json(
        { success: false, error: "No officer data found or an unexpected issue occurred during scraping." },
        { status: 404 },
      )
    }
  } catch (error: any) {
    console.error("Error in scrape-company route:", error)
    return NextResponse.json(
      { success: false, error: "Failed to scrape company officers.", details: error.message },
      { status: 500 },
    )
  }
}

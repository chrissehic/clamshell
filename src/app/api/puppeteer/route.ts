import { type NextRequest, NextResponse } from "next/server"
import puppeteer, { type Browser, type Page } from "puppeteer"

// Type definition for Puppeteer response
interface PuppeteerResponse {
  metadata: {
    title: string
    description: string
    keywords?: string
    author?: string
  }
  htmlContent: string,
  screenshot: string // Base64-encoded screenshot
  requiresVerification?: boolean
  verificationMethod?: "captcha" | "cloudflare" | "bot_detection" | "login_required"
  verificationUrl?: string
}

// Function to detect if page requires human verification
async function detectVerificationRequired(page: Page): Promise<{
  required: boolean
  method?: string
  details?: string
}> {
  try {
    const pageContent = await page.content()
    // const url = page.url()

    // Check for common verification patterns
    const verificationIndicators = [
      // Cloudflare
      { pattern: /cloudflare/i, method: "cloudflare" },
      { pattern: /checking your browser/i, method: "cloudflare" },
      { pattern: /please wait while we check your browser/i, method: "cloudflare" },

      // CAPTCHA
      { pattern: /captcha/i, method: "captcha" },
      { pattern: /recaptcha/i, method: "captcha" },
      { pattern: /hcaptcha/i, method: "captcha" },

      // Bot detection
      { pattern: /bot.{0,20}detect/i, method: "bot_detection" },
      { pattern: /human.{0,20}verif/i, method: "bot_detection" },
      { pattern: /prove.{0,20}human/i, method: "bot_detection" },

      // Login required
      { pattern: /sign.{0,5}in.{0,20}required/i, method: "login_required" },
      { pattern: /login.{0,20}required/i, method: "login_required" },
      { pattern: /access.{0,20}denied/i, method: "login_required" },
    ]

    for (const indicator of verificationIndicators) {
      if (indicator.pattern.test(pageContent)) {
        return {
          required: true,
          method: indicator.method,
          details: `Detected ${indicator.method} verification requirement`,
        }
      }
    }

    // Check for specific selectors that indicate verification
    const verificationSelectors = [
      ".cf-browser-verification", // Cloudflare
      "#cf-challenge-stage", // Cloudflare
      ".g-recaptcha", // reCAPTCHA
      ".h-captcha", // hCaptcha
      "[data-captcha]", // Generic captcha
    ]

    for (const selector of verificationSelectors) {
      const element = await page.$(selector)
      if (element) {
        return {
          required: true,
          method: "captcha",
          details: `Found verification element: ${selector}`,
        }
      }
    }

    // Check if we're stuck on a verification page by looking at the title
    const title = await page.title()
    if (/verification|captcha|cloudflare|bot.{0,20}check/i.test(title)) {
      return {
        required: true,
        method: "bot_detection",
        details: `Verification detected in page title: ${title}`,
      }
    }

    return { required: false }
  } catch (error) {
    console.error("Error detecting verification:", error)
    return { required: false }
  }
}

// Helper function to wait for a specified time
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let url = searchParams.get("url")
  const bypassVerification = searchParams.get("bypass") === "true"

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  // Add https:// if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }

  // Validate full URL now (with scheme)
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)?$/
  if (!urlPattern.test(url)) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }

  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: !bypassVerification, // Run in non-headless mode if bypassing verification
    })

    const page = await browser.newPage()

    // Set a more realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(err => {
      console.error("Page navigation failed:", err);
      throw new Error("Navigation error");
    });

    // Wait a bit for any dynamic content to load using our delay function
    await delay(2000)

    // Check if verification is required
    const verificationCheck = await detectVerificationRequired(page)

    if (verificationCheck.required && !bypassVerification) {

      const htmlContent = await page.content(); // Already a string

      // Take a screenshot of the verification page
      const screenshotBuffer = await page.screenshot()
      //@ts-expect-error don't know
      const screenshotBase64 = screenshotBuffer.toString("base64")

      return NextResponse.json(
        {
          requiresVerification: true,
          verificationMethod: verificationCheck.method,
          verificationUrl: url,
          htmlContent,
          screenshot: screenshotBase64,
          metadata: {
            title: "Verification Required",
            description: verificationCheck.details || "This website requires human verification to access.",
          },
        },
        { status: 202 },
      ) // 202 Accepted but requires action
    }

    // If we get here, either no verification is required or user requested bypass
    // Extract metadata from the page
    const metadata = await page.evaluate(() => {
      const title = document.querySelector("title")?.innerText || "Untitled";
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
        "No description available";
      const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content") || "";
      const author = document.querySelector('meta[name="author"]')?.getAttribute("content") || "";

      return { title, description, keywords, author };
    });

    // Get the full HTML content of the page
    const htmlContent = await page.content(); // Already a string

    // Take a screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    //@ts-expect-error don't know
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Structure the response
    const response: PuppeteerResponse = {
      htmlContent,
      metadata,
      screenshot: screenshotBase64,
      requiresVerification: false,
    };

    console.log("HTML Content:", htmlContent)

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Puppeteer error:", error)
    return NextResponse.json({ error: "Failed to process the URL" }, { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

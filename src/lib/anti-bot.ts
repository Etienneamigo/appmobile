/**
 * Anti-bot protection utilities
 *
 * Features:
 * - Honeypot field detection
 * - Minimum time between submissions
 * - Optional Turnstile/reCAPTCHA verification
 */

// Honeypot field names (should look like real fields to bots)
export const HONEYPOT_FIELDS = ["website_url", "phone_number", "company_name"] as const

/**
 * Check if honeypot fields are filled (indicating a bot)
 * Returns true if request appears to be from a bot
 */
export function checkHoneypot(formData: FormData): boolean {
  for (const field of HONEYPOT_FIELDS) {
    const value = formData.get(field)
    if (value && typeof value === "string" && value.trim().length > 0) {
      console.warn(`[Anti-Bot] Honeypot field '${field}' was filled - likely bot`)
      return true
    }
  }
  return false
}

/**
 * Minimum time tracking for form submissions
 * Bots typically submit forms instantly
 */
const formTimestamps = new Map<string, number>()

// Minimum time in ms that should pass between page load and form submit
const MIN_SUBMIT_TIME_MS = 2000 // 2 seconds

/**
 * Generate a form token with timestamp
 * Should be included in the form as a hidden field
 */
export function generateFormToken(): string {
  const timestamp = Date.now()
  const token = `${timestamp}_${Math.random().toString(36).substring(2, 15)}`
  formTimestamps.set(token, timestamp)

  // Cleanup old tokens (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  for (const [key, value] of formTimestamps.entries()) {
    if (value < oneHourAgo) {
      formTimestamps.delete(key)
    }
  }

  return token
}

/**
 * Validate form token and check submission timing
 * Returns null if valid, error message if suspicious
 */
export function validateFormTiming(token: string | null): string | null {
  if (!token) {
    // No token - could be legitimate (JS disabled) or bot
    // Be lenient but log it
    console.warn("[Anti-Bot] No form token provided")
    return null
  }

  const timestamp = formTimestamps.get(token)

  if (!timestamp) {
    // Unknown token - could be expired or fabricated
    console.warn("[Anti-Bot] Unknown form token")
    return null // Be lenient
  }

  const elapsed = Date.now() - timestamp
  formTimestamps.delete(token) // One-time use

  if (elapsed < MIN_SUBMIT_TIME_MS) {
    console.warn(`[Anti-Bot] Form submitted too quickly (${elapsed}ms)`)
    return "Veuillez patienter avant de soumettre le formulaire."
  }

  return null
}

/**
 * Turnstile verification (Cloudflare)
 * Only runs if TURNSTILE_SECRET_KEY is configured
 */
export async function verifyTurnstile(token: string | null): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If not configured, skip verification (allow)
  if (!secretKey) {
    return { success: true }
  }

  if (!token) {
    return { success: false, error: "Verification CAPTCHA manquante" }
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()

    if (data.success) {
      return { success: true }
    }

    console.warn("[Anti-Bot] Turnstile verification failed:", data["error-codes"])
    return { success: false, error: "Verification CAPTCHA échouée" }
  } catch (error) {
    console.error("[Anti-Bot] Turnstile verification error:", error)
    // On error, be lenient (don't block legitimate users)
    return { success: true }
  }
}

/**
 * Combined anti-bot check for forms
 * Returns null if OK, error message if blocked
 */
export async function validateAntiBot(
  formData: FormData,
  options: {
    checkHoneypot?: boolean
    checkTiming?: boolean
    checkTurnstile?: boolean
  } = {}
): Promise<string | null> {
  const { checkHoneypot: doHoneypot = true, checkTiming: doTiming = true, checkTurnstile: doTurnstile = true } = options

  // Check honeypot
  if (doHoneypot && checkHoneypot(formData)) {
    // Don't reveal to bots that they were caught - just fail silently
    return "Une erreur est survenue. Veuillez réessayer."
  }

  // Check form timing
  if (doTiming) {
    const formToken = formData.get("_formToken") as string | null
    const timingError = validateFormTiming(formToken)
    if (timingError) {
      return timingError
    }
  }

  // Check Turnstile
  if (doTurnstile) {
    const turnstileToken = formData.get("cf-turnstile-response") as string | null
    const turnstileResult = await verifyTurnstile(turnstileToken)
    if (!turnstileResult.success) {
      return turnstileResult.error || "Verification échouée"
    }
  }

  return null
}

/**
 * React component helper - honeypot fields to include in forms
 * These should be hidden with CSS (not type="hidden" as bots detect that)
 */
export const honeypotFieldsCSS = `
  .hp-field {
    position: absolute;
    left: -9999px;
    top: -9999px;
    opacity: 0;
    pointer-events: none;
    height: 0;
    width: 0;
    overflow: hidden;
  }
`

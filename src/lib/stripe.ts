import Stripe from "stripe"

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not set")
      }
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-12-15.clover" as const,
        typescript: true,
      })
    }
    return (_stripe as Stripe)[prop as keyof Stripe]
  },
})

// Configuration
export const STRIPE_CONFIG = {
  // Monthly subscription price ID - set in .env
  priceId: process.env.STRIPE_PRICE_ID || "",
  // Default trial period: exactly 60 days (2 months)
  // IMPORTANT: Only promo codes can extend this period
  trialDays: 60,
  // Monthly price in EUR
  monthlyPrice: 15,
  // Webhook secret for verifying events
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
}

// Helper to calculate trial end date with optional promo code bonus
// IMPORTANT: extraDays should ONLY come from a validated promo code
export function calculateTrialEndDate(extraDays: number = 0): Date {
  const trialDays = STRIPE_CONFIG.trialDays + extraDays
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
}

// Guard function to validate trial end date
// Returns the maximum allowed trial end date if the provided date exceeds limits
export function validateTrialEndDate(
  trialEndsAt: Date,
  hasPromoCode: boolean,
  promoExtraDays: number = 0
): Date {
  const now = new Date()
  const maxTrialDays = hasPromoCode
    ? STRIPE_CONFIG.trialDays + promoExtraDays
    : STRIPE_CONFIG.trialDays

  const maxTrialEnd = new Date(now.getTime() + maxTrialDays * 24 * 60 * 60 * 1000)

  // If the provided date exceeds the maximum allowed, cap it
  if (trialEndsAt > maxTrialEnd) {
    console.warn(
      `Trial end date ${trialEndsAt.toISOString()} exceeds max allowed (${maxTrialDays} days). Capping to ${maxTrialEnd.toISOString()}`
    )
    return maxTrialEnd
  }

  return trialEndsAt
}

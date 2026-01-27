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
  // Trial period in days (2 months = ~61 days)
  trialDays: 61,
  // Monthly price in EUR
  monthlyPrice: 15,
  // Webhook secret for verifying events
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
}

// Helper to calculate trial end date with optional promo code bonus
export function calculateTrialEndDate(extraDays: number = 0): Date {
  const trialDays = STRIPE_CONFIG.trialDays + extraDays
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
}

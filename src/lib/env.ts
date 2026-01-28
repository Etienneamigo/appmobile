import { z } from "zod"

/**
 * Environment variable validation using Zod
 * Validates at build/startup time to fail fast on missing config
 */

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  // Database (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth (required)
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .transform((v) => v === "true")
    .optional(),

  // Stripe (optional - features disabled if not set)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Redis (optional - falls back to in-memory rate limiting)
  REDIS_URL: z.string().url().optional(),

  // SMTP (optional - email features disabled if not set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Cloudflare Turnstile (optional - CAPTCHA disabled if not set)
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

// Schema for client-side environment variables (must be prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
})

// Validate server environment
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:")
    console.error(parsed.error.flatten().fieldErrors)

    // In production, fail fast
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables")
    }

    // In development, warn but continue
    console.warn("⚠️  Continuing with invalid env in development mode")
    return process.env as unknown as z.infer<typeof serverEnvSchema>
  }

  return parsed.data
}

// Validate client environment
function validateClientEnv() {
  const clientVars = {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  }

  const parsed = clientEnvSchema.safeParse(clientVars)

  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:")
    console.error(parsed.error.flatten().fieldErrors)
  }

  return parsed.data || clientVars
}

// Export validated environment
export const serverEnv = validateServerEnv()
export const clientEnv = validateClientEnv()

// Type exports for use elsewhere
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

// Helper functions to check feature availability
export const features = {
  stripe: () => !!serverEnv.STRIPE_SECRET_KEY && !!serverEnv.STRIPE_PRICE_ID,
  email: () => !!serverEnv.SMTP_HOST && !!serverEnv.SMTP_USER,
  redis: () => !!serverEnv.REDIS_URL,
  turnstile: () => !!serverEnv.TURNSTILE_SECRET_KEY,
}

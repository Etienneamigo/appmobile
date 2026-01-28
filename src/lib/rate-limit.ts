/**
 * Rate limiting system with Redis support and in-memory fallback
 *
 * Usage:
 * - Import the appropriate limiter for your use case
 * - Call checkRateLimit() with an identifier (IP, user ID, etc.)
 * - Returns { success: boolean, remaining: number, resetAt: Date }
 */

import Redis from "ioredis"

// Rate limit configuration presets
export const RATE_LIMITS = {
  // Auth endpoints - strict limits
  auth: { requests: 5, windowMs: 60 * 1000 }, // 5 per minute
  authStrict: { requests: 3, windowMs: 60 * 1000 }, // 3 per minute (login failures)

  // Registration - very strict
  registration: { requests: 3, windowMs: 5 * 60 * 1000 }, // 3 per 5 minutes

  // Upload - moderate limits
  upload: { requests: 20, windowMs: 60 * 1000 }, // 20 per minute

  // API general - generous
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 per minute

  // Admin actions - moderate
  admin: { requests: 30, windowMs: 60 * 1000 }, // 30 per minute

  // Email verification resend - strict
  emailResend: { requests: 3, windowMs: 5 * 60 * 1000 }, // 3 per 5 minutes
} as const

type RateLimitPreset = keyof typeof RATE_LIMITS

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
  limit: number
}

interface RateLimitStore {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>
  increment(key: string, windowMs: number): Promise<void>
}

// In-memory store for single-instance deployments
class InMemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (value.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetAt <= now) {
      // No entry or expired - allow request
      return {
        success: true,
        remaining: limit - 1,
        resetAt: new Date(now + windowMs),
        limit,
      }
    }

    const remaining = Math.max(0, limit - entry.count)
    return {
      success: entry.count < limit,
      remaining: Math.max(0, remaining - 1),
      resetAt: new Date(entry.resetAt),
      limit,
    }
  }

  async increment(key: string, windowMs: number): Promise<void> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetAt <= now) {
      // Create new entry
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
    } else {
      // Increment existing
      entry.count++
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Redis store for distributed deployments
class RedisStore implements RateLimitStore {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const count = await this.client.get(key)
    const ttl = await this.client.pttl(key)

    const currentCount = count ? parseInt(count, 10) : 0
    const resetAt = ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + windowMs)
    const remaining = Math.max(0, limit - currentCount - 1)

    return {
      success: currentCount < limit,
      remaining,
      resetAt,
      limit,
    }
  }

  async increment(key: string, windowMs: number): Promise<void> {
    const multi = this.client.multi()
    multi.incr(key)
    multi.pexpire(key, windowMs)
    await multi.exec()
  }
}

// Singleton instances
let redisClient: Redis | null = null
let store: RateLimitStore | null = null
let redisWarningLogged = false

function getStore(): RateLimitStore {
  if (store) return store

  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null
          return Math.min(times * 100, 3000)
        },
        lazyConnect: true,
      })

      redisClient.on("error", (err) => {
        console.error("[Rate Limit] Redis error:", err.message)
        // Fall back to in-memory on persistent errors
        if (!redisWarningLogged) {
          console.warn("[Rate Limit] Falling back to in-memory store")
          redisWarningLogged = true
        }
        store = new InMemoryStore()
      })

      redisClient.on("connect", () => {
        console.log("[Rate Limit] Connected to Redis")
      })

      store = new RedisStore(redisClient)
      return store
    } catch (err) {
      console.error("[Rate Limit] Failed to connect to Redis:", err)
    }
  }

  // Fallback to in-memory
  if (!redisWarningLogged) {
    console.warn(
      "[Rate Limit] REDIS_URL not configured - using in-memory store. " +
      "This is fine for single-instance deployments but won't work with multiple instances."
    )
    redisWarningLogged = true
  }

  store = new InMemoryStore()
  return store
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param preset - Rate limit preset name
 * @param customKey - Optional custom key prefix
 */
export async function checkRateLimit(
  identifier: string,
  preset: RateLimitPreset,
  customKey?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[preset]
  const key = `ratelimit:${customKey || preset}:${identifier}`
  const rateStore = getStore()

  const result = await rateStore.check(key, config.requests, config.windowMs)

  if (result.success) {
    await rateStore.increment(key, config.windowMs)
  }

  return result
}

/**
 * Get client IP from request headers
 * Handles proxies (X-Forwarded-For) and direct connections
 */
export function getClientIP(request: Request): string {
  // Check X-Forwarded-For header (common with reverse proxies)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // Take the first IP in the list (original client)
    const ips = forwardedFor.split(",").map((ip) => ip.trim())
    if (ips[0]) return ips[0]
  }

  // Check X-Real-IP header (Nginx)
  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP

  // Check CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get("cf-connecting-ip")
  if (cfIP) return cfIP

  // Fallback to a generic identifier
  return "unknown"
}

/**
 * Rate limit error response helper
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Trop de requêtes. Veuillez réessayer plus tard.",
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    }
  )
}

/**
 * Server action rate limit helper
 * Returns error object if rate limited, null otherwise
 */
export async function checkActionRateLimit(
  identifier: string,
  preset: RateLimitPreset
): Promise<{ error: string; retryAfter: number } | null> {
  const result = await checkRateLimit(identifier, preset)

  if (!result.success) {
    return {
      error: "Trop de requêtes. Veuillez réessayer plus tard.",
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    }
  }

  return null
}

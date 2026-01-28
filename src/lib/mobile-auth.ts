/**
 * Mobile Authentication Helper
 * JWT-based auth for mobile apps, separate from NextAuth web sessions
 */

import jwt from "jsonwebtoken"
import { prisma } from "@/lib/db"
import type { User } from "@prisma/client"

// JWT Configuration
const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || ""
const JWT_EXPIRES_IN = "30d" // 30 days

if (!JWT_SECRET) {
  console.warn("[Mobile Auth] WARNING: No JWT secret configured. Set MOBILE_JWT_SECRET or AUTH_SECRET.")
}

// JWT Payload type
export interface MobileJwtPayload {
  sub: string // userId
  role: string
  establishmentId: string | null
  iat?: number
  exp?: number
}

// Mobile user response type
export interface MobileUser {
  id: string
  email: string
  name: string | null
  role: string
  establishmentId: string | null
}

/**
 * Generate a JWT token for mobile authentication
 */
export function generateMobileToken(user: {
  id: string
  role: string
  establishmentId: string | null
}): string {
  const payload: MobileJwtPayload = {
    sub: user.id,
    role: user.role,
    establishmentId: user.establishmentId,
  }

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Verify and decode a mobile JWT token
 */
export function verifyMobileToken(token: string): MobileJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as MobileJwtPayload

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn("[Mobile Auth] Token expired")
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn("[Mobile Auth] Invalid token:", error.message)
    }
    return null
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")

  if (!authHeader) {
    return null
  }

  // Check for Bearer scheme
  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null
  }

  return parts[1]
}

/**
 * Require mobile authentication for an API route
 * Returns the authenticated user or throws a Response with 401
 *
 * Usage:
 * ```ts
 * export async function GET(request: Request) {
 *   const user = await requireMobileAuth(request)
 *   // user is guaranteed to be authenticated here
 * }
 * ```
 */
export async function requireMobileAuth(request: Request): Promise<MobileUser> {
  const token = extractBearerToken(request)

  if (!token) {
    throw new Response(
      JSON.stringify({ error: "Token d'authentification requis" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const payload = verifyMobileToken(token)

  if (!payload) {
    throw new Response(
      JSON.stringify({ error: "Token invalide ou expiré" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  // Load user from database to ensure they still exist and get fresh data
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      establishment: {
        select: { id: true },
      },
    },
  })

  if (!user) {
    throw new Response(
      JSON.stringify({ error: "Utilisateur non trouvé" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  if (!user.isActive) {
    throw new Response(
      JSON.stringify({ error: "Compte désactivé" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    establishmentId: user.establishment?.id || null,
  }
}

/**
 * Optional mobile authentication - returns user or null
 * Does not throw, useful for endpoints that work with or without auth
 */
export async function optionalMobileAuth(request: Request): Promise<MobileUser | null> {
  try {
    return await requireMobileAuth(request)
  } catch {
    return null
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { generateMobileToken } from "@/lib/mobile-auth"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

interface LoginRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  // Strict rate limiting for login attempts
  const clientIP = getClientIP(request)
  const rateLimit = await checkRateLimit(clientIP, "authStrict")
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    // Parse request body
    let body: LoginRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Corps de requête invalide" },
        { status: 400 }
      )
    }

    const { email, password } = body

    // Validate input
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        isActive: true,
        emailVerified: true,
        establishment: {
          select: { id: true },
        },
      },
    })

    // Generic error for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Compte désactivé. Contactez le support." },
        { status: 401 }
      )
    }

    // Check email verification (optional - you may want to allow unverified for mobile)
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Veuillez vérifier votre email avant de vous connecter" },
        { status: 401 }
      )
    }

    // Generate JWT token
    const establishmentId = user.establishment?.id || null
    const token = generateMobileToken({
      id: user.id,
      role: user.role,
      establishmentId,
    })

    // Return token and user info
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        establishmentId,
      },
    })
  } catch (error) {
    console.error("[Mobile Login] Error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

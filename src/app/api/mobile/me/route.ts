import { NextRequest, NextResponse } from "next/server"
import { requireMobileAuth } from "@/lib/mobile-auth"

/**
 * GET /api/mobile/me
 * Returns the authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        establishmentId: user.establishmentId,
      },
    })
  } catch (error) {
    // If requireMobileAuth throws a Response, return it
    if (error instanceof Response) {
      return error
    }

    console.error("[Mobile Me] Error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

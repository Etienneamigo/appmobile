import { NextRequest, NextResponse } from "next/server"
import { requireMobileAuth } from "@/lib/mobile-auth"

/**
 * GET /api/mobile/ping
 * Simple authenticated ping endpoint for testing mobile auth
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request)

    return NextResponse.json({
      pong: true,
      timestamp: new Date().toISOString(),
      userId: user.id,
      role: user.role,
    })
  } catch (error) {
    // If requireMobileAuth throws a Response, return it
    if (error instanceof Response) {
      return error
    }

    console.error("[Mobile Ping] Error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

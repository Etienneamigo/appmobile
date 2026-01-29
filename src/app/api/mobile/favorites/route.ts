import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../_helpers/rl"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      activity: {
        include: {
          establishment: { select: { id: true, name: true, city: true, website: true, bookingUrl: true } },
          medias: { orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  })

  return NextResponse.json({
    items: favs.map(f => ({
      createdAt: f.createdAt,
      activity: {
        ...f.activity,
        isFavorited: true,
      },
    })),
  })
}

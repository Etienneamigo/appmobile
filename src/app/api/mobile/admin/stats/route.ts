import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../../_helpers/rl"
import { ActivityStatus, UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "admin")
  if (limited) return limited

  const user = await requireMobileAuth(request)
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [
    users,
    establishments,
    activitiesTotal,
    activitiesPublished,
    activitiesDraft,
    favorites,
    medias,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.establishment.count(),
    prisma.activity.count(),
    prisma.activity.count({ where: { status: ActivityStatus.PUBLISHED } }),
    prisma.activity.count({ where: { status: ActivityStatus.DRAFT } }),
    prisma.favorite.count(),
    prisma.media.count(),
  ])

  return NextResponse.json({
    users,
    establishments,
    activities: {
      total: activitiesTotal,
      published: activitiesPublished,
      draft: activitiesDraft,
    },
    favorites,
    medias,
  })
}

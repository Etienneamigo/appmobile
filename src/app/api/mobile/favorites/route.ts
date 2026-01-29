import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../_helpers/rl"
import { UserRole } from "@prisma/client"

function parseIntSafe(v: string | null, def: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}

// Helper to get first image URL from medias
function getImageUrl(medias: { kind: string; url: string }[]): string | null {
  const image = medias.find(m => m.kind === "IMAGE")
  return image?.url || medias[0]?.url || null
}

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  let user
  try {
    user = await requireMobileAuth(request)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  if (user.role !== UserRole.USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseIntSafe(searchParams.get("page"), 1)
  const pageSize = Math.min(parseIntSafe(searchParams.get("limit") || searchParams.get("pageSize"), 20), 100)
  const skip = (page - 1) * pageSize

  const [total, favs] = await Promise.all([
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        activity: {
          include: {
            establishment: { select: { id: true, name: true, city: true, website: true, bookingUrl: true } },
            medias: { orderBy: { createdAt: "asc" }, take: 5 },
          },
        },
      },
    }),
  ])

  // Map to FavoriteItem format (flat ActivityListItem + favoritedAt)
  const items = favs.map(f => {
    const a = f.activity
    return {
      // Activity fields (flat, as ActivityListItem)
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      address: a.address,
      city: a.city,
      zipCode: a.zipCode,
      country: a.country,
      lat: a.lat,
      lng: a.lng,
      minPeople: a.minPeople,
      maxPeople: a.maxPeople,
      durationMinutes: a.durationMinutes,
      priceFrom: a.priceFrom,
      scheduleText: a.scheduleText,
      tags: a.tags,
      status: a.status,
      viewCount: a.viewCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      // Mobile-expected flat fields
      imageUrl: getImageUrl(a.medias),
      establishmentName: a.establishment?.name || "",
      bookingUrl: a.establishment?.bookingUrl || null,
      isFavorite: true, // Always true for favorites list
      // FavoriteItem additional field
      favoritedAt: f.createdAt.toISOString(),
      // Keep nested for backward compat
      establishment: a.establishment,
      medias: a.medias,
    }
  })

  return NextResponse.json({
    page,
    pageSize,
    total,
    hasMore: skip + items.length < total,
    items,
  })
}

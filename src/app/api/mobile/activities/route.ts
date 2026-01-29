import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { optionalMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../_helpers/rl"
import { ActivityStatus, ActivityType, UserRole } from "@prisma/client"

function parseIntSafe(v: string | null, def: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await optionalMobileAuth(request)

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get("search") || "").trim()
  const city = (searchParams.get("city") || "").trim()
  const type = (searchParams.get("type") || "").trim()

  const page = parseIntSafe(searchParams.get("page"), 1)
  const pageSize = Math.min(parseIntSafe(searchParams.get("pageSize"), 20), 50)
  const skip = (page - 1) * pageSize

  const where: any = {}

  // Public listing defaults to published only
  where.status = ActivityStatus.PUBLISHED

  // Optional filters
  if (type && Object.values(ActivityType).includes(type as any)) {
    where.type = type as ActivityType
  }
  if (city) {
    where.city = { contains: city, mode: "insensitive" }
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ]
  }

  const [total, itemsRaw] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        establishment: { select: { id: true, name: true, city: true, website: true, bookingUrl: true } },
        medias: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
  ])

  let favSet = new Set<string>()
  if (user?.role === UserRole.USER && itemsRaw.length) {
    const favs = await prisma.favorite.findMany({
      where: { userId: user.id, activityId: { in: itemsRaw.map(a => a.id) } },
      select: { activityId: true },
    })
    favSet = new Set(favs.map(f => f.activityId))
  }

  const items = itemsRaw.map(a => ({
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
    establishment: a.establishment,
    medias: a.medias,
    isFavorited: user?.role === UserRole.USER ? favSet.has(a.id) : false,
  }))

  return NextResponse.json({
    page,
    pageSize,
    total,
    hasMore: skip + items.length < total,
    items,
  })
}

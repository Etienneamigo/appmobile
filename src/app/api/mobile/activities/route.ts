import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { optionalMobileAuth } from "@/lib/mobile-auth"
import { enforceApiRateLimit } from "../_helpers/rl"
import { ActivityStatus, UserRole } from "@prisma/client"

function parseIntSafe(v: string | null, def: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def
}
function parseFloatSafe(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Helper to get first image URL from medias
function getImageUrl(medias: { kind: string; url: string }[]): string | null {
  const image = medias.find(m => m.kind === "IMAGE")
  return image?.url || medias[0]?.url || null
}

export async function GET(request: NextRequest) {
  const limited = await enforceApiRateLimit(request, "api")
  if (limited) return limited

  const user = await optionalMobileAuth(request)

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get("search") || "").trim()
  const city = (searchParams.get("city") || "").trim()
  const type = (searchParams.get("type") || "").trim()
  const lat = parseFloatSafe(searchParams.get("lat"))
  const lng = parseFloatSafe(searchParams.get("lng"))
  const radiusKmRaw = parseFloatSafe(searchParams.get("radiusKm"))
  // Si géoloc active mais pas de rayon fourni => défaut 10km
  const radiusKm = lat != null && lng != null ? (radiusKmRaw ?? 10) : null

  const page = parseIntSafe(searchParams.get("page"), 1)
  const pageSize = Math.min(parseIntSafe(searchParams.get("pageSize"), 20), 50)
  const skip = (page - 1) * pageSize

  const where: any = {}

  // Public listing defaults to published only
  where.status = ActivityStatus.PUBLISHED

  // Optional filters
  if (type) {
    where.type = type
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
    // Optional geo filter (bounding box) using lat/lng + radiusKm
  if (lat != null && lng != null && radiusKm != null) {
    const r = Math.min(Math.max(radiusKm, 1), 200) // clamp 1..200km
    const latDelta = r / 111.32
    const cosLat = Math.cos((lat * Math.PI) / 180)
    const lngDelta = r / (111.32 * Math.max(cosLat, 0.2)) // avoid huge delta near poles

    where.AND = where.AND || []
    where.AND.push(
      { lat: { gte: lat - latDelta, lte: lat + latDelta } },
      { lng: { gte: lng - lngDelta, lte: lng + lngDelta } }
    )
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
        medias: { orderBy: { createdAt: "asc" }, take: 5 },
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

  // Map to mobile-expected format (ActivityListItem)
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
    // Mobile-expected flat fields
    imageUrl: getImageUrl(a.medias),
    establishmentName: a.establishment?.name || "",
    bookingUrl: a.establishment?.bookingUrl || null,
    isFavorite: user?.role === UserRole.USER ? favSet.has(a.id) : false,
    // Keep nested for backward compat if needed
    establishment: a.establishment,
    medias: a.medias,
  }))

  return NextResponse.json({
    page,
    pageSize,
    total,
    hasMore: skip + items.length < total,
    items,
  })
}

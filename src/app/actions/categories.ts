"use server"

import { prisma } from "@/lib/db"
import { calculateDistance } from "@/lib/geo"
import { ZONE1_OPTIONS, ZONE2_OPTIONS, ZONE3_OPTIONS } from "@/lib/constants"
import type { Activity, Media, Establishment } from "@prisma/client"

export type ActivityWithDistance = Activity & {
  medias: Media[]
  establishment: Establishment
  distance?: number
  _count: {
    favorites: number
  }
}

// Determine which zone field a slug belongs to
function getZoneField(slug: string): { field: "zone1Tags" | "zone2Tags" | "zone3Tags"; tag: string } | null {
  const z1 = ZONE1_OPTIONS.find(o => o.value === slug)
  if (z1) return { field: "zone1Tags", tag: slug }

  const z2 = ZONE2_OPTIONS.find(o => o.value === slug)
  if (z2) return { field: "zone2Tags", tag: slug }

  const z3 = ZONE3_OPTIONS.find(o => o.value === slug)
  if (z3) return { field: "zone3Tags", tag: slug }

  return null
}

export async function searchByCategory(input: {
  slug: string
  city?: string
  lat?: number
  lng?: number
  radius?: number
}): Promise<{
  activities: ActivityWithDistance[]
  total: number
}> {
  const { slug, city, lat, lng, radius = 20 } = input

  const isDynamic = slug === "nouveautes" || slug === "coup-de-coeur"
  const zoneInfo = !isDynamic ? getZoneField(slug) : null

  // Build where clause
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
  }

  // Zone tag filter (zone 1/2/3)
  if (zoneInfo) {
    where[zoneInfo.field] = { has: zoneInfo.tag }
  }

  // City filter
  if (city) {
    where.OR = [
      { city: { contains: city, mode: "insensitive" } },
      { zipCode: { startsWith: city } },
    ]
  }

  // Order by for dynamic zones
  let orderBy: Record<string, string> | undefined
  if (slug === "nouveautes") {
    orderBy = { createdAt: "desc" }
  }

  // Fetch activities
  const allActivities = await prisma.activity.findMany({
    where,
    include: {
      medias: true,
      establishment: true,
      _count: {
        select: { favorites: true },
      },
    },
    ...(orderBy ? { orderBy } : {}),
  })

  // Calculate distance
  let activitiesWithDistance: ActivityWithDistance[] = allActivities.map((activity) => {
    if (lat !== undefined && lng !== undefined) {
      const distance = calculateDistance(lat, lng, activity.lat, activity.lng)
      return { ...activity, distance }
    }
    return { ...activity, distance: undefined }
  })

  // Filter by radius if coordinates provided
  if (lat !== undefined && lng !== undefined) {
    activitiesWithDistance = activitiesWithDistance.filter(
      (a) => a.distance !== undefined && a.distance <= radius
    )
    // Sort by distance for non-dynamic
    if (!isDynamic) {
      activitiesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    }
  }

  // For coup-de-coeur, sort by favorite count desc
  if (slug === "coup-de-coeur") {
    activitiesWithDistance.sort((a, b) => b._count.favorites - a._count.favorites)
  }

  return {
    activities: activitiesWithDistance,
    total: activitiesWithDistance.length,
  }
}

"use server"

import { prisma } from "@/lib/db"
import { calculateDistance } from "@/lib/geo"
import { searchSchema, SearchInput } from "@/lib/validations"
import type { Activity, Media, Establishment } from "@prisma/client"

export type ActivityWithDistance = Activity & {
  medias: Media[]
  establishment: Establishment
  distance?: number
  _count: {
    favorites: number
  }
}

export async function searchActivities(input: Partial<SearchInput>): Promise<{
  activities: ActivityWithDistance[]
  total: number
  page: number
  totalPages: number
}> {
  const parsed = searchSchema.safeParse({
    ...input,
    radius: input.radius || 10,
    page: input.page || 1,
    limit: input.limit || 20,
    sortBy: input.sortBy || "distance",
  })

  if (!parsed.success) {
    return { activities: [], total: 0, page: 1, totalPages: 0 }
  }

  const { lat, lng, radius, type, city, minPeople, maxPeople, priceMax, sortBy, page, limit } = parsed.data

  // Build where clause
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
  }

  if (type) {
    where.type = type
  }

  if (city) {
    where.OR = [
      { city: { contains: city, mode: "insensitive" } },
      { zipCode: { startsWith: city } },
    ]
  }

  if (minPeople) {
    where.maxPeople = { gte: minPeople }
  }

  if (maxPeople) {
    where.minPeople = { lte: maxPeople }
  }

  if (priceMax) {
    where.priceFrom = { lte: priceMax }
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
  })

  // Calculate distance and filter by radius if lat/lng provided
  let activitiesWithDistance: ActivityWithDistance[] = allActivities.map((activity) => {
    if (lat !== undefined && lng !== undefined) {
      const distance = calculateDistance(lat, lng, activity.lat, activity.lng)
      return { ...activity, distance }
    }
    return { ...activity, distance: undefined }
  })

  // Filter by radius
  if (lat !== undefined && lng !== undefined) {
    activitiesWithDistance = activitiesWithDistance.filter(
      (a) => a.distance !== undefined && a.distance <= radius
    )
  }

  // Sort
  if (sortBy === "distance" && lat !== undefined && lng !== undefined) {
    activitiesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  } else if (sortBy === "popularity") {
    activitiesWithDistance.sort((a, b) => b.viewCount - a.viewCount)
  }

  // Pagination
  const total = activitiesWithDistance.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const paginatedActivities = activitiesWithDistance.slice(start, start + limit)

  return {
    activities: paginatedActivities,
    total,
    page,
    totalPages,
  }
}

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}, France&limit=1`,
      {
        headers: {
          "User-Agent": "ActiviteApp/1.0",
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.length === 0) return null

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  } catch {
    return null
  }
}

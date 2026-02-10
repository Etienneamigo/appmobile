"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createActivityTypeConfigSchema, updateActivityTypeConfigSchema } from "@/lib/validations"
import { ACTIVITY_TYPES } from "@/lib/constants"

// Helper to check admin role
async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Non autorise")
  }
  return session
}

// Get all activity types (public - used by forms and filters)
export async function getActivityTypes() {
  try {
    const types = await prisma.activityTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    return { types }
  } catch {
    return { types: [] }
  }
}

// Get all activity types including inactive (admin only)
export async function getAllActivityTypes() {
  try {
    await requireAdmin()
    const types = await prisma.activityTypeConfig.findMany({
      orderBy: { sortOrder: "asc" },
    })
    return { types }
  } catch {
    return { error: "Erreur lors de la recuperation des types" }
  }
}

// Sync defaults + backfill: ensures ALL preconfigured types from constants
// AND all existing Activity.type values have a matching ActivityTypeConfig entry.
// Idempotent - safe to call on every page load.
export async function backfillActivityTypes() {
  try {
    // Get existing config slugs
    const existingConfigs = await prisma.activityTypeConfig.findMany({
      select: { slug: true, label: true, id: true },
    })
    const existingSlugs = new Set(existingConfigs.map((c) => c.slug))

    // Sync labels for existing preconfigured types (handles renames like "Bar dansant" → "Bar/pub/club")
    const defaultEntries = Object.entries(ACTIVITY_TYPES)
    for (const [slug, info] of defaultEntries) {
      const existing = existingConfigs.find((c) => c.slug === slug)
      if (existing && existing.label !== info.label) {
        await prisma.activityTypeConfig.update({
          where: { id: existing.id },
          data: { label: info.label },
        })
      }
    }

    // 1. Sync preconfigured defaults from ACTIVITY_TYPES constant
    const missingDefaults = defaultEntries.filter(([slug]) => !existingSlugs.has(slug))

    // 2. Backfill from existing Activity.type values in DB
    const distinctTypes = await prisma.activity.groupBy({ by: ["type"] })
    const missingFromDb = distinctTypes
      .map((t) => t.type)
      .filter((type) => type && !existingSlugs.has(type))
      // Also exclude types we're about to create from defaults
      .filter((type) => !missingDefaults.some(([slug]) => slug === type))

    const totalMissing = missingDefaults.length + missingFromDb.length
    if (totalMissing === 0) return { created: 0 }

    // Get max sort order for appending
    const maxOrder = await prisma.activityTypeConfig.aggregate({
      _max: { sortOrder: true },
    })
    let nextOrder = (maxOrder._max.sortOrder ?? 0) + 1

    const toCreate = [
      // Defaults get their proper label/emoji from the constants
      ...missingDefaults.map(([slug, info]) => ({
        slug,
        label: info.label,
        emoji: info.emoji,
        isActive: true,
        sortOrder: nextOrder++,
      })),
      // DB-only types get a generated label
      ...missingFromDb.map((slug) => ({
        slug,
        label: slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase().replace(/_/g, " "),
        emoji: "🎯",
        isActive: true,
        sortOrder: nextOrder++,
      })),
    ]

    await prisma.activityTypeConfig.createMany({ data: toCreate })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { created: totalMissing }
  } catch {
    return { created: 0 }
  }
}

// Create a new activity type
export async function createActivityType(data: {
  slug: string
  label: string
  emoji: string
  iconUrl?: string | null
  isActive?: boolean
  sortOrder?: number
}) {
  try {
    await requireAdmin()

    const parsed = createActivityTypeConfigSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    // Check if slug already exists
    const existing = await prisma.activityTypeConfig.findUnique({
      where: { slug: parsed.data.slug },
    })

    if (existing) {
      return { error: "Ce slug existe deja" }
    }

    const activityType = await prisma.activityTypeConfig.create({
      data: {
        slug: parsed.data.slug,
        label: parsed.data.label,
        emoji: parsed.data.emoji,
        iconUrl: parsed.data.iconUrl ?? null,
        isActive: parsed.data.isActive ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { activityType }
  } catch {
    return { error: "Erreur lors de la creation" }
  }
}

// Update an activity type
export async function updateActivityType(
  id: string,
  data: {
    slug?: string
    label?: string
    emoji?: string
    iconUrl?: string | null
    isActive?: boolean
    sortOrder?: number
  }
) {
  try {
    await requireAdmin()

    const parsed = updateActivityTypeConfigSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    // If changing slug, check uniqueness
    if (parsed.data.slug) {
      const existing = await prisma.activityTypeConfig.findUnique({
        where: { slug: parsed.data.slug },
      })
      if (existing && existing.id !== id) {
        return { error: "Ce slug existe deja" }
      }
    }

    const activityType = await prisma.activityTypeConfig.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { activityType }
  } catch {
    return { error: "Erreur lors de la modification" }
  }
}

// Delete an activity type
export async function deleteActivityType(id: string) {
  try {
    await requireAdmin()

    // Check if any activities use this type
    const typeConfig = await prisma.activityTypeConfig.findUnique({
      where: { id },
    })

    if (!typeConfig) {
      return { error: "Type non trouve" }
    }

    const activitiesUsingType = await prisma.activity.count({
      where: { type: typeConfig.slug },
    })

    if (activitiesUsingType > 0) {
      return {
        error: `Impossible de supprimer : ${activitiesUsingType} activite(s) utilisent ce type. Desactivez-le ou re-assignez les activites d'abord.`,
        activitiesCount: activitiesUsingType,
      }
    }

    await prisma.activityTypeConfig.delete({
      where: { id },
    })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { success: true }
  } catch {
    return { error: "Erreur lors de la suppression" }
  }
}

// Toggle active status of an activity type
export async function toggleActivityTypeActive(id: string) {
  try {
    await requireAdmin()

    const typeConfig = await prisma.activityTypeConfig.findUnique({
      where: { id },
    })

    if (!typeConfig) {
      return { error: "Type non trouve" }
    }

    const updated = await prisma.activityTypeConfig.update({
      where: { id },
      data: { isActive: !typeConfig.isActive },
    })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { activityType: updated }
  } catch {
    return { error: "Erreur lors de la modification" }
  }
}

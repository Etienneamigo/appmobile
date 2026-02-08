"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createActivityTypeConfigSchema, updateActivityTypeConfigSchema } from "@/lib/validations"

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

// Backfill: create ActivityTypeConfig for Activity.type values that don't have one
export async function backfillActivityTypes() {
  try {
    // Get all distinct type values from activities
    const distinctTypes = await prisma.activity.groupBy({
      by: ["type"],
    })

    // Get existing config slugs
    const existingConfigs = await prisma.activityTypeConfig.findMany({
      select: { slug: true },
    })
    const existingSlugs = new Set(existingConfigs.map((c) => c.slug))

    // Find missing types
    const missingTypes = distinctTypes
      .map((t) => t.type)
      .filter((type) => type && !existingSlugs.has(type))

    if (missingTypes.length === 0) return { created: 0 }

    // Get max sort order
    const maxOrder = await prisma.activityTypeConfig.aggregate({
      _max: { sortOrder: true },
    })
    let nextOrder = (maxOrder._max.sortOrder ?? 0) + 1

    // Create missing types
    await prisma.activityTypeConfig.createMany({
      data: missingTypes.map((slug) => ({
        slug,
        label: slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase().replace(/_/g, " "),
        emoji: "🎯",
        isActive: true,
        sortOrder: nextOrder++,
      })),
    })

    revalidatePath("/admin/types-activite")
    revalidatePath("/")
    revalidatePath("/recherche")
    return { created: missingTypes.length }
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

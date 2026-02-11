"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createPromoCodeSchema, updatePromoCodeSchema } from "@/lib/validations"
import { calculateTrialEndDate } from "@/lib/stripe"

// Helper to check admin role
async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Non autorise")
  }
  return session
}

// User management
export async function toggleUserActive(userId: string) {
  try {
    await requireAdmin()

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: "Utilisateur non trouve" }
    }

    // Don't allow deactivating admins
    if (user.role === "ADMIN") {
      return { error: "Impossible de desactiver un administrateur" }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    })

    revalidatePath("/admin/users")
    return { user: updatedUser }
  } catch (error) {
    return { error: "Erreur lors de la modification" }
  }
}

export async function deleteUser(userId: string) {
  try {
    await requireAdmin()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { establishment: true },
    })

    if (!user) {
      return { error: "Utilisateur non trouve" }
    }

    if (user.role === "ADMIN") {
      return { error: "Impossible de supprimer un administrateur" }
    }

    // Delete user (cascades to favorites, establishment, activities, etc.)
    await prisma.user.delete({
      where: { id: userId },
    })

    revalidatePath("/admin/users")
    revalidatePath("/admin/etablissements")
    return { success: true }
  } catch (error) {
    return { error: "Erreur lors de la suppression" }
  }
}

// Promo code management
export async function createPromoCode(data: {
  code: string
  description?: string
  extraTrialDays?: number
  maxRedemptions?: number | null
  expiresAt?: string | null
  isActive?: boolean
}) {
  try {
    await requireAdmin()

    const parsed = createPromoCodeSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code: parsed.data.code.toUpperCase() },
    })

    if (existing) {
      return { error: "Ce code promo existe deja" }
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        description: parsed.data.description,
        extraTrialDays: parsed.data.extraTrialDays,
        maxRedemptions: parsed.data.maxRedemptions,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        isActive: parsed.data.isActive ?? true,
      },
    })

    revalidatePath("/admin/promo-codes")
    return { promoCode }
  } catch (error) {
    return { error: "Erreur lors de la creation" }
  }
}

export async function updatePromoCode(
  id: string,
  data: {
    code?: string
    description?: string
    extraTrialDays?: number
    maxRedemptions?: number | null
    expiresAt?: string | null
    isActive?: boolean
  }
) {
  try {
    await requireAdmin()

    const parsed = updatePromoCodeSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(parsed.data.code && { code: parsed.data.code.toUpperCase() }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.extraTrialDays !== undefined && { extraTrialDays: parsed.data.extraTrialDays }),
        ...(parsed.data.maxRedemptions !== undefined && { maxRedemptions: parsed.data.maxRedemptions }),
        ...(parsed.data.expiresAt !== undefined && {
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    })

    revalidatePath("/admin/promo-codes")
    return { promoCode }
  } catch (error) {
    return { error: "Erreur lors de la modification" }
  }
}

export async function deletePromoCode(id: string) {
  try {
    await requireAdmin()

    await prisma.promoCode.delete({
      where: { id },
    })

    revalidatePath("/admin/promo-codes")
    return { success: true }
  } catch (error) {
    return { error: "Erreur lors de la suppression" }
  }
}

export async function togglePromoCodeActive(id: string) {
  try {
    await requireAdmin()

    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
    })

    if (!promoCode) {
      return { error: "Code promo non trouve" }
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { isActive: !promoCode.isActive },
    })

    revalidatePath("/admin/promo-codes")
    return { promoCode: updated }
  } catch (error) {
    return { error: "Erreur lors de la modification" }
  }
}

// Site settings management
export async function getSiteSettings() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: "default" },
      })
    }

    return { settings }
  } catch (error) {
    console.error("Error fetching site settings:", error)
    return { error: "Erreur lors de la recuperation des parametres" }
  }
}

export async function updateSiteSettings(data: {
  heroVideoDesktopUrl?: string | null
  heroVideoMobileUrl?: string | null
  heroVideoDesktopName?: string | null
  heroVideoMobileName?: string | null
  heroImageDesktopUrl?: string | null
  heroImageMobileUrl?: string | null
  heroImageDesktopName?: string | null
  heroImageMobileName?: string | null
}) {
  try {
    await requireAdmin()

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        ...(data.heroVideoDesktopUrl !== undefined && { heroVideoDesktopUrl: data.heroVideoDesktopUrl }),
        ...(data.heroVideoMobileUrl !== undefined && { heroVideoMobileUrl: data.heroVideoMobileUrl }),
        ...(data.heroVideoDesktopName !== undefined && { heroVideoDesktopName: data.heroVideoDesktopName }),
        ...(data.heroVideoMobileName !== undefined && { heroVideoMobileName: data.heroVideoMobileName }),
        ...(data.heroImageDesktopUrl !== undefined && { heroImageDesktopUrl: data.heroImageDesktopUrl }),
        ...(data.heroImageMobileUrl !== undefined && { heroImageMobileUrl: data.heroImageMobileUrl }),
        ...(data.heroImageDesktopName !== undefined && { heroImageDesktopName: data.heroImageDesktopName }),
        ...(data.heroImageMobileName !== undefined && { heroImageMobileName: data.heroImageMobileName }),
      },
      create: {
        id: "default",
        heroVideoDesktopUrl: data.heroVideoDesktopUrl,
        heroVideoMobileUrl: data.heroVideoMobileUrl,
        heroVideoDesktopName: data.heroVideoDesktopName,
        heroVideoMobileName: data.heroVideoMobileName,
        heroImageDesktopUrl: data.heroImageDesktopUrl,
        heroImageMobileUrl: data.heroImageMobileUrl,
        heroImageDesktopName: data.heroImageDesktopName,
        heroImageMobileName: data.heroImageMobileName,
      },
    })

    revalidatePath("/")
    revalidatePath("/admin/parametres")
    return { settings }
  } catch (error) {
    console.error("Error updating site settings:", error)
    return { error: "Erreur lors de la mise a jour des parametres" }
  }
}

export async function deleteHeroVideo(type: "desktop" | "mobile") {
  try {
    await requireAdmin()

    const updateData = type === "desktop"
      ? { heroVideoDesktopUrl: null, heroVideoDesktopName: null }
      : { heroVideoMobileUrl: null, heroVideoMobileName: null }

    const settings = await prisma.siteSettings.update({
      where: { id: "default" },
      data: updateData,
    })

    revalidatePath("/")
    revalidatePath("/admin/parametres")
    return { settings }
  } catch (error) {
    return { error: "Erreur lors de la suppression" }
  }
}

export async function deleteHeroImage(type: "desktop" | "mobile") {
  try {
    await requireAdmin()

    const updateData = type === "desktop"
      ? { heroImageDesktopUrl: null, heroImageDesktopName: null }
      : { heroImageMobileUrl: null, heroImageMobileName: null }

    const settings = await prisma.siteSettings.update({
      where: { id: "default" },
      data: updateData,
    })

    revalidatePath("/")
    revalidatePath("/admin/parametres")
    return { settings }
  } catch (error) {
    return { error: "Erreur lors de la suppression" }
  }
}

// Toggle adminPick for an activity
export async function toggleAdminPick(activityId: string) {
  try {
    await requireAdmin()

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    })

    if (!activity) {
      return { error: "Activité non trouvée" }
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: { adminPick: !activity.adminPick },
    })

    revalidatePath("/admin/etablissements")
    revalidatePath("/")
    return { activity: updated }
  } catch {
    return { error: "Erreur lors de la modification" }
  }
}

// Establishment management
export async function toggleEstablishmentSubscription(establishmentId: string) {
  try {
    await requireAdmin()

    const establishment = await prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: { usedPromoCode: true },
    })

    if (!establishment) {
      return { error: "Etablissement non trouve" }
    }

    // Toggle between ACTIVE and CANCELED for manual override
    const newStatus = establishment.subscriptionStatus === "ACTIVE" ? "CANCELED" : "ACTIVE"

    // Calculate proper trial end date respecting promo code if used
    // IMPORTANT: No arbitrary 365-day trials - respect the promo code system
    const extraDays = establishment.usedPromoCode?.extraTrialDays || 0
    const trialEndDate = calculateTrialEndDate(extraDays)

    const updated = await prisma.establishment.update({
      where: { id: establishmentId },
      data: {
        subscriptionStatus: newStatus,
        // If activating, set trial end respecting the promo code system (60 days + promo bonus)
        ...(newStatus === "ACTIVE" && {
          trialEndsAt: trialEndDate,
        }),
      },
    })

    revalidatePath("/admin/etablissements")
    return { establishment: updated }
  } catch (error) {
    return { error: "Erreur lors de la modification" }
  }
}

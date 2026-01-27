"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateSettingsSchema = z.object({
  website: z.string().url().optional().or(z.literal("")),
  bookingUrl: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
})

export async function updateEstablishmentSettings(formData: FormData) {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorisé" }
    }

    const rawData = {
      website: formData.get("website") as string || "",
      bookingUrl: formData.get("bookingUrl") as string || "",
      phone: formData.get("phone") as string || "",
    }

    const parsed = updateSettingsSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const { website, bookingUrl, phone } = parsed.data

    await prisma.establishment.update({
      where: { id: session.user.establishmentId },
      data: {
        website: website || null,
        bookingUrl: bookingUrl || null,
        phone: phone || null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating establishment settings:", error)
    return { error: "Erreur lors de la mise à jour des paramètres" }
  }
}

export async function getEstablishmentSettings() {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorisé" }
    }

    const establishment = await prisma.establishment.findUnique({
      where: { id: session.user.establishmentId },
      select: {
        name: true,
        phone: true,
        website: true,
        bookingUrl: true,
        address: true,
        city: true,
        zipCode: true,
      },
    })

    if (!establishment) {
      return { error: "Établissement non trouvé" }
    }

    return { establishment }
  } catch (error) {
    console.error("Error getting establishment settings:", error)
    return { error: "Erreur lors de la récupération des paramètres" }
  }
}

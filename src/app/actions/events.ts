"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Validation schema for event
const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre est trop long"),
  description: z.string().max(2000, "La description est trop longue").optional().nullable(),
  startAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Date de debut invalide"),
  endAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Date de fin invalide"),
  allDay: z.boolean().optional().default(false),
})

// Helper to check establishment owns the activity
async function requireEstablishmentActivity(activityId: string) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    throw new Error("Non autorise")
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { establishment: true },
  })

  if (!activity) {
    throw new Error("Activite non trouvee")
  }

  if (activity.establishmentId !== session.user.establishmentId) {
    throw new Error("Non autorise")
  }

  return { session, activity }
}

// Create event
export async function createEvent(activityId: string, data: {
  title: string
  description?: string | null
  startAt: string
  endAt: string
  allDay?: boolean
}) {
  try {
    await requireEstablishmentActivity(activityId)

    const parsed = eventSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const { title, description, startAt, endAt, allDay } = parsed.data

    // Validate end date is after start date
    if (new Date(endAt) < new Date(startAt)) {
      return { error: "La date de fin doit etre apres la date de debut" }
    }

    const event = await prisma.event.create({
      data: {
        activityId,
        title,
        description: description || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        allDay: allDay || false,
      },
    })

    revalidatePath(`/etablissement/activites/${activityId}`)
    revalidatePath(`/activite/${activityId}`)
    return { event }
  } catch (error) {
    console.error("Error creating event:", error)
    return { error: error instanceof Error ? error.message : "Erreur lors de la creation de l'evenement" }
  }
}

// Update event
export async function updateEvent(eventId: string, data: {
  title?: string
  description?: string | null
  startAt?: string
  endAt?: string
  allDay?: boolean
}) {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorise" }
    }

    // Find the event and check ownership
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { activity: true },
    })

    if (!existingEvent) {
      return { error: "Evenement non trouve" }
    }

    if (existingEvent.activity.establishmentId !== session.user.establishmentId) {
      return { error: "Non autorise" }
    }

    // Validate partial data
    const updateData: {
      title?: string
      description?: string | null
      startAt?: Date
      endAt?: Date
      allDay?: boolean
    } = {}

    if (data.title !== undefined) {
      if (data.title.length < 1) return { error: "Le titre est requis" }
      if (data.title.length > 200) return { error: "Le titre est trop long" }
      updateData.title = data.title
    }

    if (data.description !== undefined) {
      updateData.description = data.description
    }

    if (data.startAt !== undefined) {
      if (isNaN(Date.parse(data.startAt))) return { error: "Date de debut invalide" }
      updateData.startAt = new Date(data.startAt)
    }

    if (data.endAt !== undefined) {
      if (isNaN(Date.parse(data.endAt))) return { error: "Date de fin invalide" }
      updateData.endAt = new Date(data.endAt)
    }

    if (data.allDay !== undefined) {
      updateData.allDay = data.allDay
    }

    // Validate end date is after start date if both are being updated
    const finalStartAt = updateData.startAt || existingEvent.startAt
    const finalEndAt = updateData.endAt || existingEvent.endAt
    if (finalEndAt < finalStartAt) {
      return { error: "La date de fin doit etre apres la date de debut" }
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    })

    revalidatePath(`/etablissement/activites/${existingEvent.activityId}`)
    revalidatePath(`/activite/${existingEvent.activityId}`)
    return { event }
  } catch (error) {
    console.error("Error updating event:", error)
    return { error: "Erreur lors de la mise a jour de l'evenement" }
  }
}

// Delete event
export async function deleteEvent(eventId: string) {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorise" }
    }

    // Find the event and check ownership
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { activity: true },
    })

    if (!existingEvent) {
      return { error: "Evenement non trouve" }
    }

    if (existingEvent.activity.establishmentId !== session.user.establishmentId) {
      return { error: "Non autorise" }
    }

    await prisma.event.delete({
      where: { id: eventId },
    })

    revalidatePath(`/etablissement/activites/${existingEvent.activityId}`)
    revalidatePath(`/activite/${existingEvent.activityId}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting event:", error)
    return { error: "Erreur lors de la suppression de l'evenement" }
  }
}

// Get events for an activity (public)
export async function getActivityEvents(activityId: string, options?: {
  upcoming?: boolean
  limit?: number
}) {
  try {
    const where: { activityId: string; startAt?: { gte: Date } } = { activityId }

    if (options?.upcoming) {
      where.startAt = { gte: new Date() }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
      take: options?.limit,
    })

    return { events }
  } catch (error) {
    console.error("Error fetching events:", error)
    return { error: "Erreur lors de la recuperation des evenements" }
  }
}

// Get events for establishment's activity (with ownership check)
export async function getMyActivityEvents(activityId: string) {
  try {
    const { activity } = await requireEstablishmentActivity(activityId)

    const events = await prisma.event.findMany({
      where: { activityId: activity.id },
      orderBy: { startAt: "asc" },
    })

    return { events }
  } catch (error) {
    console.error("Error fetching events:", error)
    return { error: error instanceof Error ? error.message : "Erreur lors de la recuperation des evenements" }
  }
}

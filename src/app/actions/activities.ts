"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { createActivitySchema, updateActivitySchema, CreateActivityInput } from "@/lib/validations"

export async function getEstablishmentActivities() {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  const activities = await prisma.activity.findMany({
    where: { establishmentId: session.user.establishmentId },
    include: {
      medias: true,
      _count: {
        select: { favorites: true }
      }
    },
    orderBy: { createdAt: "desc" },
  })

  return { activities }
}

export async function getActivityById(id: string) {
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      medias: true,
      establishment: true,
    },
  })

  return activity
}

export async function createActivity(data: CreateActivityInput) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  const parsed = createActivitySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const activity = await prisma.activity.create({
    data: {
      ...parsed.data,
      establishmentId: session.user.establishmentId,
    },
  })

  revalidatePath("/etablissement/dashboard")
  revalidatePath("/recherche")

  return { activity }
}

export async function updateActivity(id: string, data: Partial<CreateActivityInput>) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  // Vérifier que l'activité appartient à l'établissement
  const existingActivity = await prisma.activity.findFirst({
    where: {
      id,
      establishmentId: session.user.establishmentId
    },
  })

  if (!existingActivity) {
    return { error: "Activité non trouvée" }
  }

  const parsed = updateActivitySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const activity = await prisma.activity.update({
    where: { id },
    data: parsed.data,
  })

  revalidatePath("/etablissement/dashboard")
  revalidatePath(`/etablissement/activites/${id}`)
  revalidatePath(`/activite/${id}`)
  revalidatePath("/recherche")

  return { activity }
}

export async function deleteActivity(id: string) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  // Vérifier que l'activité appartient à l'établissement
  const existingActivity = await prisma.activity.findFirst({
    where: {
      id,
      establishmentId: session.user.establishmentId
    },
  })

  if (!existingActivity) {
    return { error: "Activité non trouvée" }
  }

  await prisma.activity.delete({
    where: { id },
  })

  revalidatePath("/etablissement/dashboard")
  revalidatePath("/recherche")

  return { success: true }
}

export async function toggleActivityStatus(id: string) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      establishmentId: session.user.establishmentId
    },
  })

  if (!activity) {
    return { error: "Activité non trouvée" }
  }

  const newStatus = activity.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: { status: newStatus },
  })

  revalidatePath("/etablissement/dashboard")
  revalidatePath(`/activite/${id}`)
  revalidatePath("/recherche")

  return { activity: updatedActivity }
}

export async function addMediaToActivity(activityId: string, url: string, kind: "IMAGE" | "VIDEO") {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  // Vérifier que l'activité appartient à l'établissement
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      establishmentId: session.user.establishmentId
    },
  })

  if (!activity) {
    return { error: "Activité non trouvée" }
  }

  const media = await prisma.media.create({
    data: {
      activityId,
      url,
      kind,
    },
  })

  revalidatePath(`/etablissement/activites/${activityId}`)
  revalidatePath(`/activite/${activityId}`)

  return { media }
}

export async function deleteMedia(id: string) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return { error: "Non autorisé" }
  }

  const media = await prisma.media.findUnique({
    where: { id },
    include: {
      activity: true,
    },
  })

  if (!media || media.activity.establishmentId !== session.user.establishmentId) {
    return { error: "Média non trouvé" }
  }

  await prisma.media.delete({
    where: { id },
  })

  revalidatePath(`/etablissement/activites/${media.activityId}`)
  revalidatePath(`/activite/${media.activityId}`)

  return { success: true }
}

export async function incrementViewCount(activityId: string) {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  })
}

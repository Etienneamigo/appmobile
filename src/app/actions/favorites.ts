"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function toggleFavorite(activityId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Vous devez être connecté pour ajouter aux favoris" }
  }

  if (session.user.role !== "USER") {
    return { error: "Seuls les utilisateurs peuvent ajouter des favoris" }
  }

  // Check if favorite exists
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_activityId: {
        userId: session.user.id,
        activityId,
      },
    },
  })

  if (existingFavorite) {
    // Remove favorite
    await prisma.favorite.delete({
      where: {
        userId_activityId: {
          userId: session.user.id,
          activityId,
        },
      },
    })

    revalidatePath(`/activite/${activityId}`)
    revalidatePath("/favoris")

    return { isFavorited: false }
  } else {
    // Add favorite
    await prisma.favorite.create({
      data: {
        userId: session.user.id,
        activityId,
      },
    })

    revalidatePath(`/activite/${activityId}`)
    revalidatePath("/favoris")

    return { isFavorited: true }
  }
}

export async function getUserFavorites() {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Non autorisé", favorites: [] }
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      activity: {
        include: {
          medias: true,
          establishment: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return { favorites }
}

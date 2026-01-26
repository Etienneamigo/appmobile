import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { incrementViewCount } from "@/app/actions/activities"
import { ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"
import { ActivityDetail } from "./ActivityDetail"

interface ActivityPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ActivityPageProps) {
  const { id } = await params
  const activity = await prisma.activity.findUnique({
    where: { id, status: "PUBLISHED" },
  })

  if (!activity) {
    return { title: "Activité non trouvée" }
  }

  const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]

  return {
    title: `${activity.title} - ${typeInfo?.label || activity.type}`,
    description: activity.description.slice(0, 160),
  }
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { id } = await params
  const session = await auth()

  const activity = await prisma.activity.findUnique({
    where: { id, status: "PUBLISHED" },
    include: {
      medias: true,
      establishment: true,
      _count: {
        select: { favorites: true },
      },
    },
  })

  if (!activity) {
    notFound()
  }

  // Check if user has favorited this activity
  let isFavorited = false
  if (session?.user?.id) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_activityId: {
          userId: session.user.id,
          activityId: activity.id,
        },
      },
    })
    isFavorited = !!favorite
  }

  // Increment view count
  await incrementViewCount(activity.id)

  return (
    <ActivityDetail
      activity={activity}
      isFavorited={isFavorited}
      isAuthenticated={!!session}
      userId={session?.user?.id}
    />
  )
}

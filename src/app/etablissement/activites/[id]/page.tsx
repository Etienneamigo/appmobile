import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { ActivityForm } from "@/components/forms/ActivityForm"
import { MediaManager } from "./MediaManager"
import { EventManager } from "./EventManager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface EditActivityPageProps {
  params: Promise<{ id: string }>
}

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.establishmentId) {
    redirect("/auth/connexion")
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      establishmentId: session.user.establishmentId,
    },
    include: {
      medias: true,
      events: {
        orderBy: { startAt: "asc" },
      },
    },
  })

  if (!activity) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Modifier l&apos;activité</h1>
        <p className="text-muted-foreground">{activity.title}</p>
      </div>

      {/* Gestionnaire de médias */}
      <Card>
        <CardHeader>
          <CardTitle>Medias</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaManager activityId={activity.id} medias={activity.medias} />
        </CardContent>
      </Card>

      {/* Calendrier d'événements */}
      <Card>
        <CardHeader>
          <CardTitle>Calendrier</CardTitle>
          <CardDescription>
            Gerez vos evenements, soirees speciales et animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventManager activityId={activity.id} events={activity.events} />
        </CardContent>
      </Card>

      {/* Formulaire d'édition */}
      <ActivityForm activity={activity} mode="edit" />
    </div>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"
import { MapPin, Heart, Clock, Euro, Users } from "lucide-react"
import { FavoriteButton } from "./FavoriteButton"

export default async function FavoritesPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/connexion")
  }

  if (session.user.role !== "USER") {
    redirect("/")
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mes favoris</h1>
        <p className="text-muted-foreground mb-8">
          {favorites.length === 0
            ? "Vous n'avez pas encore de favoris"
            : `${favorites.length} activité${favorites.length > 1 ? "s" : ""} sauvegardée${favorites.length > 1 ? "s" : ""}`}
        </p>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Explorez les activités et ajoutez vos préférées aux favoris
              </p>
              <Button asChild>
                <Link href="/recherche">Découvrir des activités</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map(({ activity }) => {
              const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]
              const firstImage = activity.medias.find((m) => m.kind === "IMAGE")

              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Image */}
                      <Link
                        href={`/activite/${activity.id}`}
                        className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-200"
                      >
                        {firstImage ? (
                          <img
                            src={firstImage.url}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            {typeInfo?.emoji || "🎯"}
                          </div>
                        )}
                      </Link>

                      {/* Info */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/activite/${activity.id}`}>
                              <Badge variant="secondary" className="mb-2">
                                {typeInfo?.emoji} {typeInfo?.label || activity.type}
                              </Badge>
                              <h3 className="font-semibold line-clamp-1 hover:text-primary">
                                {activity.title}
                              </h3>
                            </Link>
                            <FavoriteButton activityId={activity.id} />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {activity.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {activity.city}
                          </span>
                          {activity.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {activity.durationMinutes} min
                            </span>
                          )}
                          {activity.priceFrom && (
                            <span className="flex items-center gap-1">
                              <Euro className="h-4 w-4" />
                              à partir de {activity.priceFrom}€
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"
import { Plus, Eye, Heart, Edit, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ActivityActions } from "./ActivityActions"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return null
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: session.user.establishmentId },
  })

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

  const stats = {
    total: activities.length,
    published: activities.filter(a => a.status === "PUBLISHED").length,
    totalViews: activities.reduce((sum, a) => sum + a.viewCount, 0),
    totalFavorites: activities.reduce((sum, a) => sum + a._count.favorites, 0),
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{establishment?.name}</h1>
          <p className="text-muted-foreground">Gérez vos activités</p>
        </div>
        <Button asChild>
          <Link href="/etablissement/activites/nouvelle">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle activité
          </Link>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total activités</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publiées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favoris</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFavorites}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des activités */}
      <Card>
        <CardHeader>
          <CardTitle>Mes activités</CardTitle>
          <CardDescription>
            {activities.length === 0
              ? "Vous n'avez pas encore créé d'activité"
              : `${activities.length} activité${activities.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Créez votre première activité pour commencer
              </p>
              <Button asChild>
                <Link href="/etablissement/activites/nouvelle">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une activité
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]
                const firstImage = activity.medias.find(m => m.kind === "IMAGE")

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {firstImage ? (
                        <img
                          src={firstImage.url}
                          alt={activity.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {typeInfo?.emoji || "🎯"}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{activity.title}</h3>
                        <Badge variant={activity.status === "PUBLISHED" ? "default" : "secondary"}>
                          {activity.status === "PUBLISHED" ? "Publié" : "Brouillon"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {typeInfo?.emoji} {typeInfo?.label} • {activity.city}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {activity.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {activity._count.favorites}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/etablissement/activites/${activity.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <ActivityActions activity={activity} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

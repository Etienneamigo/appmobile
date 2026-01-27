import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Tag, Activity, Eye, MousePointer } from "lucide-react"

export default async function AdminDashboard() {
  // Fetch stats
  const [
    userCount,
    establishmentCount,
    activityCount,
    promoCodeCount,
    activePromoCodeCount,
    totalImpressions,
    totalClicks,
    recentUsers,
    recentEstablishments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.establishment.count(),
    prisma.activity.count({ where: { status: "PUBLISHED" } }),
    prisma.promoCode.count(),
    prisma.promoCode.count({ where: { isActive: true } }),
    prisma.activityStatEvent.count({ where: { type: "IMPRESSION" } }),
    prisma.activityStatEvent.count({ where: { type: "CLICK" } }),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.establishment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { email: true } },
        activity: { select: { title: true, status: true } },
      },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">comptes utilisateur</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etablissements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{establishmentCount}</div>
            <p className="text-xs text-muted-foreground">{activityCount} activites publiees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes promo</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodeCount}</div>
            <p className="text-xs text-muted-foreground">{activePromoCodeCount} actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground">{totalImpressions} impressions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers utilisateurs</CardTitle>
            <CardDescription>Les 5 derniers utilisateurs inscrits</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun utilisateur</p>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name || "Sans nom"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Establishments */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers etablissements</CardTitle>
            <CardDescription>Les 5 derniers etablissements inscrits</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEstablishments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun etablissement</p>
            ) : (
              <div className="space-y-4">
                {recentEstablishments.map((establishment) => (
                  <div key={establishment.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{establishment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {establishment.activity?.title || "Aucune activite"}
                        {establishment.activity && (
                          <span className={`ml-2 text-xs ${
                            establishment.activity.status === "PUBLISHED"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}>
                            ({establishment.activity.status === "PUBLISHED" ? "Publie" : "Brouillon"})
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(establishment.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

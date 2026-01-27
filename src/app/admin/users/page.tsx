import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserActions } from "./UserActions"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["USER", "ESTABLISHMENT"] } },
    orderBy: { createdAt: "desc" },
    include: {
      establishment: {
        include: {
          activity: { select: { title: true, status: true } },
        },
      },
      _count: {
        select: { favorites: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <p className="text-muted-foreground">Gestion des comptes utilisateurs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>{users.length} utilisateur(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name || "Sans nom"}</p>
                    <Badge variant={user.role === "ESTABLISHMENT" ? "default" : "secondary"}>
                      {user.role === "ESTABLISHMENT" ? "Etablissement" : "Utilisateur"}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="destructive">Desactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.establishment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Etablissement: {user.establishment.name}
                      {user.establishment.activity && (
                        <span className="ml-2">
                          - {user.establishment.activity.title}
                          <span className={`ml-1 ${
                            user.establishment.activity.status === "PUBLISHED"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}>
                            ({user.establishment.activity.status === "PUBLISHED" ? "Publie" : "Brouillon"})
                          </span>
                        </span>
                      )}
                    </p>
                  )}
                  {user.role === "USER" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {user._count.favorites} favori(s)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground mr-4">
                    Inscrit le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <UserActions user={user} />
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun utilisateur
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

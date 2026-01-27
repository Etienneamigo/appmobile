import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PromoCodeActions } from "./PromoCodeActions"
import { CreatePromoCodeForm } from "./CreatePromoCodeForm"

export default async function PromoCodesPage() {
  const promoCodes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { establishments: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Codes promo</h1>
        <p className="text-muted-foreground">
          Gerez les codes promotionnels pour les periodes d&apos;essai etendues
        </p>
      </div>

      {/* Create new promo code */}
      <CreatePromoCodeForm />

      {/* List of promo codes */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des codes promo</CardTitle>
          <CardDescription>{promoCodes.length} code(s) promo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promoCodes.map((promoCode) => {
              const isExpired = promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()
              const isMaxedOut = promoCode.maxRedemptions && promoCode.redeemedCount >= promoCode.maxRedemptions

              return (
                <div
                  key={promoCode.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {promoCode.code}
                      </code>
                      {promoCode.isActive && !isExpired && !isMaxedOut ? (
                        <Badge className="bg-green-500">Actif</Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive">Expire</Badge>
                      ) : isMaxedOut ? (
                        <Badge variant="secondary">Limite atteinte</Badge>
                      ) : (
                        <Badge variant="outline">Inactif</Badge>
                      )}
                    </div>

                    {promoCode.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {promoCode.description}
                      </p>
                    )}

                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>+{promoCode.extraTrialDays} jours d&apos;essai</span>
                      <span>
                        {promoCode.redeemedCount}
                        {promoCode.maxRedemptions ? `/${promoCode.maxRedemptions}` : ""} utilisations
                      </span>
                      {promoCode.expiresAt && (
                        <span>
                          Expire le {new Date(promoCode.expiresAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <PromoCodeActions promoCode={promoCode} />
                </div>
              )
            })}

            {promoCodes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun code promo. Creez-en un ci-dessus.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

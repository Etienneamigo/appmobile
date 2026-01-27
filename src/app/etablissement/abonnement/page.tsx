import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STRIPE_CONFIG } from "@/lib/stripe"
import { SubscriptionActions } from "./SubscriptionActions"
import { Check } from "lucide-react"

export default async function SubscriptionPage() {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return null
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: session.user.establishmentId },
  })

  if (!establishment) {
    return null
  }

  const isTrialing = establishment.subscriptionStatus === "TRIALING" ||
    (establishment.trialEndsAt && new Date(establishment.trialEndsAt) > new Date() && !establishment.subscriptionStatus)

  const isActive = establishment.subscriptionStatus === "ACTIVE" || isTrialing

  const daysRemaining = establishment.trialEndsAt
    ? Math.max(0, Math.ceil((establishment.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0

  function getStatusBadge() {
    switch (establishment?.subscriptionStatus) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Actif</Badge>
      case "TRIALING":
        return <Badge className="bg-blue-500">Periode d&apos;essai</Badge>
      case "PAST_DUE":
        return <Badge className="bg-orange-500">Paiement en retard</Badge>
      case "CANCELED":
        return <Badge variant="destructive">Annule</Badge>
      default:
        if (isTrialing) {
          return <Badge className="bg-blue-500">Periode d&apos;essai</Badge>
        }
        return <Badge variant="secondary">Non configure</Badge>
    }
  }

  const features = [
    "Page activite personnalisee",
    "Upload d'images et videos",
    "Apparition dans les recherches",
    "Statistiques detaillees",
    "Support prioritaire",
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">Gerez votre abonnement et facturation</p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Statut actuel</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialing && daysRemaining > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">
                Periode d&apos;essai gratuite
              </p>
              <p className="text-blue-700">
                Il vous reste <span className="font-bold">{daysRemaining} jours</span> d&apos;essai gratuit.
              </p>
            </div>
          )}

          {establishment.subscriptionStatus === "ACTIVE" && establishment.currentPeriodEnd && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-900">
                Abonnement actif
              </p>
              <p className="text-green-700">
                Prochain renouvellement le {new Date(establishment.currentPeriodEnd).toLocaleDateString("fr-FR")}
              </p>
            </div>
          )}

          {establishment.subscriptionStatus === "PAST_DUE" && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="font-medium text-orange-900">
                Paiement en retard
              </p>
              <p className="text-orange-700">
                Veuillez mettre a jour votre moyen de paiement pour continuer a utiliser le service.
              </p>
            </div>
          )}

          {establishment.subscriptionStatus === "CANCELED" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-900">
                Abonnement annule
              </p>
              <p className="text-red-700">
                Votre activite n&apos;est plus visible dans les recherches. Reabonnez-vous pour la reactiver.
              </p>
            </div>
          )}

          <SubscriptionActions
            hasSubscription={!!establishment.stripeSubscriptionId}
            hasCustomer={!!establishment.stripeCustomerId}
            isActive={!!isActive}
          />
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Tarification</CardTitle>
          <CardDescription>
            Un seul plan, toutes les fonctionnalites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold">{STRIPE_CONFIG.monthlyPrice}€</span>
            <span className="text-muted-foreground">/ mois</span>
          </div>

          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>2 mois d&apos;essai gratuit</strong> inclus a l&apos;inscription.
              Aucun engagement, annulez a tout moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

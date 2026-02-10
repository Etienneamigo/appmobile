import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STRIPE_CONFIG } from "@/lib/stripe"
import { SubscriptionActions } from "./SubscriptionActions"
import { Check } from "lucide-react"
import { getSubscriptionDisplayState, isSubscriptionActive } from "@/lib/subscription"

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

  const displayState = getSubscriptionDisplayState({
    subscriptionStatus: establishment.subscriptionStatus,
    trialEndsAt: establishment.trialEndsAt,
    currentPeriodEnd: establishment.currentPeriodEnd,
  })

  const active = isSubscriptionActive({
    subscriptionStatus: establishment.subscriptionStatus,
    trialEndsAt: establishment.trialEndsAt,
    currentPeriodEnd: establishment.currentPeriodEnd,
  })

  const badgeVariantMap = {
    success: "default" as const,
    info: "default" as const,
    warning: "default" as const,
    destructive: "destructive" as const,
    secondary: "secondary" as const,
  }

  const badgeColorMap = {
    success: "bg-green-500",
    info: "bg-blue-500",
    warning: "bg-orange-500",
    destructive: "",
    secondary: "",
  }

  const alertColorMap = {
    success: { bg: "bg-green-50", border: "border-green-200", title: "text-green-900", text: "text-green-700" },
    info: { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-900", text: "text-blue-700" },
    warning: { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-900", text: "text-orange-700" },
    destructive: { bg: "bg-red-50", border: "border-red-200", title: "text-red-900", text: "text-red-700" },
    secondary: { bg: "bg-gray-50", border: "border-gray-200", title: "text-gray-900", text: "text-gray-700" },
  }

  const colors = alertColorMap[displayState.variant]

  const features = [
    "Page activité personnalisée",
    "Upload d'images et vidéos",
    "Apparition dans les recherches",
    "Statistiques détaillées",
    "Support prioritaire",
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">Gérez votre abonnement et facturation</p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Statut actuel</CardTitle>
            <Badge
              variant={badgeVariantMap[displayState.variant]}
              className={badgeColorMap[displayState.variant] || undefined}
            >
              {displayState.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 ${colors.bg} border ${colors.border} rounded-lg`}>
            <p className={`font-medium ${colors.title}`}>
              {displayState.label}
            </p>
            <p className={colors.text}>
              {displayState.description}
            </p>
          </div>

          <SubscriptionActions
            hasSubscription={!!establishment.stripeSubscriptionId}
            hasCustomer={!!establishment.stripeCustomerId}
            isActive={active}
            isCanceledWithTrial={displayState.status === "canceled_trial_active"}
          />
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Tarification</CardTitle>
          <CardDescription>
            Un seul plan, toutes les fonctionnalités
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
              <strong>2 mois d&apos;essai gratuit</strong> inclus à l&apos;inscription.
              Aucun engagement, annulez à tout moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

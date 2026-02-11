"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createCheckoutSession, createBillingPortalSession } from "@/app/actions/stripe"
import { toast } from "sonner"
import { CreditCard, Settings, XCircle, RotateCcw } from "lucide-react"

interface SubscriptionActionsProps {
  hasSubscription: boolean
  hasCustomer: boolean
  isActive: boolean
  isCanceledWithTrial?: boolean
}

export function SubscriptionActions({
  hasSubscription,
  hasCustomer,
  isActive,
  isCanceledWithTrial,
}: SubscriptionActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  async function handleSubscribe() {
    setIsLoading(true)
    setLoadingAction("subscribe")
    const result = await createCheckoutSession()
    setIsLoading(false)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  async function handleManageBilling() {
    setIsLoading(true)
    setLoadingAction("billing")
    const result = await createBillingPortalSession()
    setIsLoading(false)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  async function handleCancelSubscription() {
    setIsLoading(true)
    setLoadingAction("cancel")
    const result = await createBillingPortalSession()
    setIsLoading(false)
    setLoadingAction(null)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Canceled with active trial — show reactivate CTA */}
      {isCanceledWithTrial && hasCustomer && (
        <Button onClick={handleManageBilling} disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {loadingAction === "billing" ? "Chargement..." : "Réactiver mon abonnement"}
        </Button>
      )}

      {/* Not active at all — show subscribe */}
      {!isActive && !isCanceledWithTrial && (
        <Button onClick={handleSubscribe} disabled={isLoading}>
          <CreditCard className="mr-2 h-4 w-4" />
          {loadingAction === "subscribe" ? "Chargement..." : "S'abonner maintenant"}
        </Button>
      )}

      {hasCustomer && (
        <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
          <Settings className="mr-2 h-4 w-4" />
          {loadingAction === "billing" ? "Chargement..." : "Gérer la facturation"}
        </Button>
      )}

      {hasSubscription && isActive && !isCanceledWithTrial && (
        <Button variant="destructive" onClick={handleCancelSubscription} disabled={isLoading}>
          <XCircle className="mr-2 h-4 w-4" />
          {loadingAction === "cancel" ? "Chargement..." : "Annuler l'abonnement"}
        </Button>
      )}
    </div>
  )
}

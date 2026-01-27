"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createCheckoutSession, createBillingPortalSession } from "@/app/actions/stripe"
import { toast } from "sonner"
import { CreditCard, Settings } from "lucide-react"

interface SubscriptionActionsProps {
  hasSubscription: boolean
  hasCustomer: boolean
  isActive: boolean
}

export function SubscriptionActions({
  hasSubscription,
  hasCustomer,
  isActive,
}: SubscriptionActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubscribe() {
    setIsLoading(true)
    const result = await createCheckoutSession()
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  async function handleManageBilling() {
    setIsLoading(true)
    const result = await createBillingPortalSession()
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="flex gap-3">
      {!isActive && (
        <Button onClick={handleSubscribe} disabled={isLoading}>
          <CreditCard className="mr-2 h-4 w-4" />
          {isLoading ? "Chargement..." : "S'abonner maintenant"}
        </Button>
      )}

      {hasCustomer && (
        <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
          <Settings className="mr-2 h-4 w-4" />
          {isLoading ? "Chargement..." : "Gerer la facturation"}
        </Button>
      )}
    </div>
  )
}

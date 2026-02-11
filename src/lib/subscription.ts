/**
 * Pure function to compute subscription display state.
 * Handles the edge case where status is CANCELED but trial is still active.
 */

export type SubscriptionDisplayState =
  | { status: "active"; label: string; description: string; variant: "success" }
  | { status: "trialing"; label: string; description: string; daysRemaining: number; variant: "info" }
  | { status: "canceled_trial_active"; label: string; description: string; daysRemaining: number; trialEndDate: Date; variant: "warning" }
  | { status: "past_due"; label: string; description: string; variant: "warning" }
  | { status: "canceled"; label: string; description: string; variant: "destructive" }
  | { status: "not_configured"; label: string; description: string; variant: "secondary" }

interface SubscriptionInput {
  subscriptionStatus: string | null | undefined
  trialEndsAt: Date | null | undefined
  currentPeriodEnd: Date | null | undefined
}

export function getSubscriptionDisplayState(
  input: SubscriptionInput,
  now: Date = new Date()
): SubscriptionDisplayState {
  const { subscriptionStatus, trialEndsAt, currentPeriodEnd } = input

  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null
  const trialActive = trialEnd ? trialEnd > now : false
  const daysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0

  // CANCELED but trial still running → special state
  if (subscriptionStatus === "CANCELED" && trialActive && daysRemaining > 0) {
    return {
      status: "canceled_trial_active",
      label: "Essai actif — annulation prévue",
      description: `Essai actif jusqu'au ${trialEnd!.toLocaleDateString("fr-FR")}. L'annulation prendra effet à la fin de l'essai.`,
      daysRemaining,
      trialEndDate: trialEnd!,
      variant: "warning",
    }
  }

  switch (subscriptionStatus) {
    case "ACTIVE":
      return {
        status: "active",
        label: "Actif",
        description: currentPeriodEnd
          ? `Prochain renouvellement le ${new Date(currentPeriodEnd).toLocaleDateString("fr-FR")}`
          : "Abonnement actif",
        variant: "success",
      }

    case "TRIALING":
      return {
        status: "trialing",
        label: "Période d'essai",
        description: daysRemaining > 0
          ? `Il vous reste ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} d'essai gratuit.`
          : "Votre période d'essai a expiré.",
        daysRemaining,
        variant: "info",
      }

    case "PAST_DUE":
      return {
        status: "past_due",
        label: "Paiement en retard",
        description: "Veuillez mettre à jour votre moyen de paiement pour continuer à utiliser le service.",
        variant: "warning",
      }

    case "CANCELED":
      return {
        status: "canceled",
        label: "Annulé",
        description: "Votre activité n'est plus visible dans les recherches. Réabonnez-vous pour la réactiver.",
        variant: "destructive",
      }

    default:
      // No explicit status — check for implicit trial
      if (trialActive && daysRemaining > 0) {
        return {
          status: "trialing",
          label: "Période d'essai",
          description: `Il vous reste ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} d'essai gratuit.`,
          daysRemaining,
          variant: "info",
        }
      }
      return {
        status: "not_configured",
        label: "Non configuré",
        description: "Aucun abonnement actif.",
        variant: "secondary",
      }
  }
}

/** Whether the establishment should be considered "functionally active" (visible) */
export function isSubscriptionActive(input: SubscriptionInput, now: Date = new Date()): boolean {
  const state = getSubscriptionDisplayState(input, now)
  return ["active", "trialing", "canceled_trial_active"].includes(state.status)
}

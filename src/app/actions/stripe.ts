"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"

// Create a checkout session for subscription
export async function createCheckoutSession() {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorise" }
    }

    const establishment = await prisma.establishment.findUnique({
      where: { id: session.user.establishmentId },
      include: { user: true },
    })

    if (!establishment) {
      return { error: "Etablissement non trouve" }
    }

    // If already has a Stripe customer, use it
    let customerId = establishment.stripeCustomerId

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: establishment.user.email,
        name: establishment.name,
        metadata: {
          establishmentId: establishment.id,
          userId: establishment.user.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await prisma.establishment.update({
        where: { id: establishment.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Check if already has active subscription
    if (establishment.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(
        establishment.stripeSubscriptionId
      )

      if (subscription.status === "active" || subscription.status === "trialing") {
        return { error: "Vous avez deja un abonnement actif" }
      }
    }

    // Determine trial settings for checkout
    // IMPORTANT: Never give a new trial at checkout - use existing trialEndsAt or start billing immediately
    // Trial/promo is only applied at registration, not at checkout
    const now = new Date()
    const hasActiveTrialOrPromo = establishment.trialEndsAt && establishment.trialEndsAt > now

    // Build subscription_data based on trial status
    let trialEnd: number | "now" | undefined

    if (hasActiveTrialOrPromo) {
      // Use trial_end (Unix timestamp) to sync with existing trial end date
      // This does NOT give extra trial - it just aligns Stripe with our DB
      trialEnd = Math.floor(establishment.trialEndsAt!.getTime() / 1000)
      console.log(`[Stripe Checkout] Establishment ${establishment.id}: syncing trial_end to ${establishment.trialEndsAt?.toISOString()}`)
    } else {
      // No active trial/promo - billing starts immediately (no trial)
      trialEnd = "now"
      console.log(`[Stripe Checkout] Establishment ${establishment.id}: no active trial, billing starts immediately`)
    }

    // Create checkout session
    // Note: trial_end is a valid Stripe API parameter but may not be typed in all SDK versions
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1,
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscription_data: {
        metadata: {
          establishmentId: establishment.id,
        },
        trial_end: trialEnd,
      } as any,
      // Never allow promotion codes at checkout - they're only for registration
      allow_promotion_codes: false,
      success_url: `${process.env.NEXTAUTH_URL}/etablissement/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/etablissement/abonnement`,
      metadata: {
        establishmentId: establishment.id,
      },
    })

    return { url: checkoutSession.url }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return { error: "Erreur lors de la creation de la session de paiement" }
  }
}

// Create a billing portal session
export async function createBillingPortalSession() {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorise" }
    }

    const establishment = await prisma.establishment.findUnique({
      where: { id: session.user.establishmentId },
    })

    if (!establishment?.stripeCustomerId) {
      return { error: "Aucun compte de facturation trouve" }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: establishment.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/etablissement/dashboard`,
    })

    return { url: portalSession.url }
  } catch (error) {
    console.error("Error creating billing portal session:", error)
    return { error: "Erreur lors de l'acces au portail de facturation" }
  }
}

// Get subscription status
export async function getSubscriptionStatus() {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorise" }
    }

    const establishment = await prisma.establishment.findUnique({
      where: { id: session.user.establishmentId },
    })

    if (!establishment) {
      return { error: "Etablissement non trouve" }
    }

    const isTrialing = establishment.subscriptionStatus === "TRIALING" ||
      (establishment.trialEndsAt && new Date(establishment.trialEndsAt) > new Date())

    const isActive = establishment.subscriptionStatus === "ACTIVE" || isTrialing

    const daysRemaining = establishment.trialEndsAt
      ? Math.max(0, Math.ceil((establishment.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0

    return {
      status: establishment.subscriptionStatus,
      isActive,
      isTrialing,
      trialEndsAt: establishment.trialEndsAt,
      currentPeriodEnd: establishment.currentPeriodEnd,
      daysRemaining,
    }
  } catch (error) {
    console.error("Error getting subscription status:", error)
    return { error: "Erreur lors de la recuperation du statut" }
  }
}

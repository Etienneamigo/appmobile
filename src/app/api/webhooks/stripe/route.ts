import { NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_CONFIG } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import Stripe from "stripe"

// Disable body parsing - we need the raw body for signature verification
export const dynamic = "force-dynamic"

// Extended type for Stripe Subscription that includes current_period_end
// This property exists in the API response but may not be fully typed in SDK
interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_end: number
  current_period_start: number
}

// Helper to safely get current_period_end from subscription
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const sub = subscription as SubscriptionWithPeriod
  if (typeof sub.current_period_end === "number") {
    return new Date(sub.current_period_end * 1000)
  }
  // Fallback: use items[0] if available
  const firstItem = subscription.items?.data?.[0]
  if (firstItem?.current_period_end) {
    return new Date(firstItem.current_period_end * 1000)
  }
  // Ultimate fallback: 30 days from now
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const establishmentId = subscription.metadata.establishmentId

  if (!establishmentId) {
    console.error("No establishmentId in subscription metadata")
    return
  }

  await prisma.establishment.update({
    where: { id: establishmentId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status === "trialing" ? "TRIALING" : "ACTIVE",
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    },
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find establishment by subscription ID
  const establishment = await prisma.establishment.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!establishment) {
    console.error("Establishment not found for subscription:", subscription.id)
    return
  }

  // Map Stripe status to our enum
  let status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "INCOMPLETE"
  switch (subscription.status) {
    case "trialing":
      status = "TRIALING"
      break
    case "active":
      status = "ACTIVE"
      break
    case "past_due":
      status = "PAST_DUE"
      break
    case "canceled":
    case "unpaid":
      status = "CANCELED"
      break
    case "incomplete":
    case "incomplete_expired":
      status = "INCOMPLETE"
      break
    default:
      status = "CANCELED"
  }

  await prisma.establishment.update({
    where: { id: establishment.id },
    data: {
      subscriptionStatus: status,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const establishment = await prisma.establishment.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!establishment) {
    return
  }

  await prisma.establishment.update({
    where: { id: establishment.id },
    data: {
      subscriptionStatus: "CANCELED",
      stripeSubscriptionId: null,
    },
  })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const establishmentId = session.metadata?.establishmentId

  if (!establishmentId) {
    return
  }

  // Update customer ID if needed
  if (session.customer) {
    await prisma.establishment.update({
      where: { id: establishmentId },
      data: {
        stripeCustomerId: session.customer as string,
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      )
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "invoice.payment_failed":
        // Handle failed payment - could send email notification
        console.log("Payment failed for invoice:", event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

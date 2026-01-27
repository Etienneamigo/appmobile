"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"

// Generate or get session ID for anonymous tracking
async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get("session_id")?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    // Note: Setting cookies in server actions requires proper handling
    // The sessionId will be set client-side for anonymous users
  }

  return sessionId
}

// Track impression when activity appears in search results
export async function trackImpression(activityId: string, sessionId?: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const trackingSessionId = sessionId || await getSessionId()

    // Debounce: Don't track same impression within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const recentImpression = await prisma.activityStatEvent.findFirst({
      where: {
        activityId,
        type: "IMPRESSION",
        sessionId: trackingSessionId,
        createdAt: { gte: fiveMinutesAgo },
      },
    })

    if (recentImpression) {
      return { success: true, deduplicated: true }
    }

    await prisma.activityStatEvent.create({
      data: {
        activityId,
        type: "IMPRESSION",
        sessionId: trackingSessionId,
        userId,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error tracking impression:", error)
    return { error: "Failed to track impression" }
  }
}

// Track click when user opens activity detail page
export async function trackClick(activityId: string, sessionId?: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const trackingSessionId = sessionId || await getSessionId()

    // Debounce: Don't track same click within 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

    const recentClick = await prisma.activityStatEvent.findFirst({
      where: {
        activityId,
        type: "CLICK",
        sessionId: trackingSessionId,
        createdAt: { gte: oneMinuteAgo },
      },
    })

    if (recentClick) {
      return { success: true, deduplicated: true }
    }

    // Create click event
    await prisma.activityStatEvent.create({
      data: {
        activityId,
        type: "CLICK",
        sessionId: trackingSessionId,
        userId,
      },
    })

    // Also increment viewCount on activity (for backward compatibility)
    await prisma.activity.update({
      where: { id: activityId },
      data: { viewCount: { increment: 1 } },
    })

    return { success: true }
  } catch (error) {
    console.error("Error tracking click:", error)
    return { error: "Failed to track click" }
  }
}

// Batch track impressions for multiple activities (for search results)
export async function trackImpressions(activityIds: string[], sessionId?: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const trackingSessionId = sessionId || await getSessionId()

    // Debounce: Find which activities were already tracked in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const recentImpressions = await prisma.activityStatEvent.findMany({
      where: {
        activityId: { in: activityIds },
        type: "IMPRESSION",
        sessionId: trackingSessionId,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { activityId: true },
    })

    const recentlyTrackedIds = new Set(recentImpressions.map(i => i.activityId))
    const newActivityIds = activityIds.filter(id => !recentlyTrackedIds.has(id))

    if (newActivityIds.length === 0) {
      return { success: true, tracked: 0, deduplicated: activityIds.length }
    }

    // Batch create impressions
    await prisma.activityStatEvent.createMany({
      data: newActivityIds.map(activityId => ({
        activityId,
        type: "IMPRESSION" as const,
        sessionId: trackingSessionId,
        userId,
      })),
    })

    return {
      success: true,
      tracked: newActivityIds.length,
      deduplicated: recentlyTrackedIds.size,
    }
  } catch (error) {
    console.error("Error tracking impressions:", error)
    return { error: "Failed to track impressions" }
  }
}

// Get analytics stats for an activity (for establishment dashboard)
export async function getActivityStats(activityId: string) {
  try {
    const session = await auth()

    if (!session?.user?.establishmentId) {
      return { error: "Non autorisé" }
    }

    // Verify ownership
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { establishmentId: true },
    })

    if (activity?.establishmentId !== session.user.establishmentId) {
      return { error: "Non autorisé" }
    }

    // Get stats for different time periods
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      impressionsToday,
      impressionsWeek,
      impressionsMonth,
      clicksToday,
      clicksWeek,
      clicksMonth,
    ] = await Promise.all([
      prisma.activityStatEvent.count({
        where: { activityId, type: "IMPRESSION", createdAt: { gte: today } },
      }),
      prisma.activityStatEvent.count({
        where: { activityId, type: "IMPRESSION", createdAt: { gte: thisWeek } },
      }),
      prisma.activityStatEvent.count({
        where: { activityId, type: "IMPRESSION", createdAt: { gte: thisMonth } },
      }),
      prisma.activityStatEvent.count({
        where: { activityId, type: "CLICK", createdAt: { gte: today } },
      }),
      prisma.activityStatEvent.count({
        where: { activityId, type: "CLICK", createdAt: { gte: thisWeek } },
      }),
      prisma.activityStatEvent.count({
        where: { activityId, type: "CLICK", createdAt: { gte: thisMonth } },
      }),
    ])

    return {
      impressions: {
        today: impressionsToday,
        week: impressionsWeek,
        month: impressionsMonth,
      },
      clicks: {
        today: clicksToday,
        week: clicksWeek,
        month: clicksMonth,
      },
      ctr: {
        week: impressionsWeek > 0 ? (clicksWeek / impressionsWeek * 100).toFixed(1) : "0",
        month: impressionsMonth > 0 ? (clicksMonth / impressionsMonth * 100).toFixed(1) : "0",
      },
    }
  } catch (error) {
    console.error("Error getting activity stats:", error)
    return { error: "Failed to get stats" }
  }
}

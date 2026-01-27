"use client"

import { useEffect, useState } from "react"
import { trackClick } from "@/app/actions/analytics"

// Get or create a session ID for anonymous analytics tracking
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""

  let sessionId = localStorage.getItem("analytics_session_id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("analytics_session_id", sessionId)
  }
  return sessionId
}

interface ClickTrackerProps {
  activityId: string
}

export function ClickTracker({ activityId }: ClickTrackerProps) {
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    if (tracked) return

    const sessionId = getOrCreateSessionId()
    if (sessionId) {
      trackClick(activityId, sessionId)
      setTracked(true)
    }
  }, [activityId, tracked])

  // This component renders nothing - it just tracks the click
  return null
}

"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { ActivityWithDistance } from "@/app/actions/search"
import { ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"

interface ActivityMapProps {
  activities: ActivityWithDistance[]
  center?: { lat: number; lng: number }
  onActivityClick?: (id: string) => void
}

export function ActivityMap({ activities, center, onActivityClick }: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
    }

    // Default center (Paris)
    const defaultCenter = center || { lat: 48.8566, lng: 2.3522 }

    // Initialize map
    const map = L.map(mapRef.current).setView(
      [defaultCenter.lat, defaultCenter.lng],
      center ? 12 : 6
    )

    mapInstanceRef.current = map

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Add user location marker if available
    if (center) {
      const userIcon = L.divIcon({
        className: "user-marker",
        html: `<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      L.marker([center.lat, center.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Votre position")
    }

    // Add activity markers
    const bounds: [number, number][] = []

    activities.forEach((activity) => {
      const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]
      const emoji = typeInfo?.emoji || "📍"

      const icon = L.divIcon({
        className: "activity-marker",
        html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 20px; cursor: pointer;">${emoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })

      const marker = L.marker([activity.lat, activity.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${activity.title}</strong><br/>
            <span style="color: #666;">${typeInfo?.label || activity.type}</span>
            ${activity.distance !== undefined ? `<br/><small>${activity.distance.toFixed(1)} km</small>` : ""}
          </div>
        `)

      marker.on("click", () => {
        if (onActivityClick) {
          onActivityClick(activity.id)
        }
      })

      bounds.push([activity.lat, activity.lng])
    })

    // Fit bounds if we have activities
    if (bounds.length > 0) {
      if (center) {
        bounds.push([center.lat, center.lng])
      }
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [activities, center, onActivityClick])

  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[300px] rounded-lg z-0"
      style={{ background: "#e5e7eb" }}
    />
  )
}

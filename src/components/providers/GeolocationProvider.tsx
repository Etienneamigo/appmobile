"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface GeolocationState {
  lat: number
  lng: number
  cityName?: string
}

interface GeolocationContextValue {
  location: GeolocationState | null
  isGeolocating: boolean
  error: string | null
  /** Request browser geolocation and persist */
  requestGeolocation: () => void
  /** Manually set location (e.g. from city geocoding) */
  setLocation: (loc: GeolocationState) => void
  /** Clear persisted location */
  clearLocation: () => void
}

const STORAGE_KEY = "wadelo_user_location"

const GeolocationContext = createContext<GeolocationContextValue | null>(null)

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<GeolocationState | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as GeolocationState
        if (parsed.lat && parsed.lng) {
          setLocationState(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Persist to sessionStorage on change
  const persist = useCallback((loc: GeolocationState | null) => {
    try {
      if (loc) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [])

  const setLocation = useCallback((loc: GeolocationState) => {
    setLocationState(loc)
    setError(null)
    persist(loc)
  }, [persist])

  const clearLocation = useCallback(() => {
    setLocationState(null)
    setError(null)
    persist(null)
  }, [persist])

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur")
      return
    }

    setIsGeolocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc: GeolocationState = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        // Reverse geocode to get city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=10`,
            { headers: { "User-Agent": "WadeloApp/1.0" } }
          )
          if (res.ok) {
            const data = await res.json()
            loc.cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality
          }
        } catch {
          // City name is optional, don't block
        }

        setLocation(loc)
        setIsGeolocating(false)
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Permission de localisation refusée")
            break
          case err.POSITION_UNAVAILABLE:
            setError("Position indisponible")
            break
          case err.TIMEOUT:
            setError("Délai de localisation dépassé")
            break
          default:
            setError("Impossible d'obtenir votre position")
        }
        setIsGeolocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [setLocation])

  return (
    <GeolocationContext.Provider
      value={{ location, isGeolocating, error, requestGeolocation, setLocation, clearLocation }}
    >
      {children}
    </GeolocationContext.Provider>
  )
}

export function useGeolocation() {
  const ctx = useContext(GeolocationContext)
  if (!ctx) {
    throw new Error("useGeolocation must be used within a GeolocationProvider")
  }
  return ctx
}

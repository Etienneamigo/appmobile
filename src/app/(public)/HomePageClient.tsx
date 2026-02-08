"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_OPTIONS_PLAIN, DISTANCE_OPTIONS } from "@/lib/constants"
import { MapPin, Search, Navigation, Loader2 } from "lucide-react"

interface ActivityTypeOption {
  value: string
  label: string
  emoji?: string
  iconUrl?: string | null
}

interface HomePageClientProps {
  heroVideoDesktopUrl?: string | null
  heroVideoMobileUrl?: string | null
  heroImageDesktopUrl?: string | null
  heroImageMobileUrl?: string | null
  activityTypeOptions?: ActivityTypeOption[]
}

// Normalize upload URLs to use API route for proper MIME type handling
function normalizeUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

export function HomePageClient({
  heroVideoDesktopUrl,
  heroVideoMobileUrl,
  heroImageDesktopUrl,
  heroImageMobileUrl,
  activityTypeOptions,
}: HomePageClientProps) {
  // Options with emojis/icons for the category grid
  const typeOptions = activityTypeOptions && activityTypeOptions.length > 0
    ? activityTypeOptions
    : ACTIVITY_TYPE_OPTIONS
  // Options without emojis for the dropdown
  const dropdownOptions = activityTypeOptions && activityTypeOptions.length > 0
    ? activityTypeOptions.map(o => ({ value: o.value, label: o.label }))
    : ACTIVITY_TYPE_OPTIONS_PLAIN
  const router = useRouter()
  const [city, setCity] = useState("")
  const [type, setType] = useState("")
  const [radius, setRadius] = useState("10")
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Determine background media with fallback: video > image > none
  const videoUrl = isMobile ? heroVideoMobileUrl : heroVideoDesktopUrl
  const finalVideoUrl = videoUrl || heroVideoDesktopUrl
  const hasVideo = !!finalVideoUrl

  const imageUrl = isMobile ? heroImageMobileUrl : heroImageDesktopUrl
  const finalImageUrl = imageUrl || heroImageDesktopUrl
  const hasImage = !hasVideo && !!finalImageUrl

  const hasMedia = hasVideo || hasImage

  function handleGeolocation() {
    if (!navigator.geolocation) {
      alert("La geolocalisation n'est pas supportee par votre navigateur")
      return
    }

    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsGeolocating(false)
        setCity("") // Clear city when using geolocation
      },
      () => {
        alert("Impossible d'obtenir votre position")
        setIsGeolocating(false)
      }
    )
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    const params = new URLSearchParams()

    if (userLocation) {
      params.set("lat", userLocation.lat.toString())
      params.set("lng", userLocation.lng.toString())
    } else if (city) {
      params.set("city", city)
    }

    if (type && type !== "all") {
      params.set("type", type)
    }

    params.set("radius", radius)

    router.push(`/recherche?${params.toString()}`)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section — compact */}
      <section className="relative overflow-hidden">
        {/* Background media (if any) */}
        {hasVideo && (
          <>
            <video
              key={finalVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={normalizeUploadUrl(finalVideoUrl!)} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        {hasImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${normalizeUploadUrl(finalImageUrl!)})` }}
            />
            <div className="absolute inset-0 bg-black/30" />
          </>
        )}

        <div className={`relative z-10 ${hasMedia ? "py-12 md:py-20" : "pt-10 pb-8 md:pt-16 md:pb-12"}`}>
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-6 md:mb-8">
              <h1 className={`text-2xl md:text-4xl font-bold tracking-tight ${hasMedia ? "text-white drop-shadow-md" : "text-gray-900"}`}>
                découvrez quoi faire, simplement
              </h1>
            </div>

            {/* Search form — compact inline */}
            <div className={`max-w-3xl mx-auto ${hasMedia ? "bg-white rounded-xl shadow-lg p-4 md:p-5" : ""}`}>
              <form onSubmit={handleSearch}>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* City input */}
                  <div className="relative flex-1 min-w-0">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Ville ou code postal"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value)
                        setUserLocation(null)
                      }}
                      className="pl-9 h-10 text-sm bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Geolocation */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeolocation}
                    disabled={isGeolocating}
                    className="h-10 px-3 border-gray-200 text-gray-600 shrink-0 sm:w-auto w-full"
                  >
                    {isGeolocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    <span className="ml-1.5 text-sm">
                      {userLocation ? "Localisé" : "Me localiser"}
                    </span>
                  </Button>

                  {/* Type */}
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-10 text-sm border-gray-200 sm:w-44 w-full">
                      <SelectValue placeholder="Type d'activité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {dropdownOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Radius */}
                  <Select value={radius} onValueChange={setRadius}>
                    <SelectTrigger className="h-10 text-sm border-gray-200 sm:w-28 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTANCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Submit */}
                  <Button type="submit" className="h-10 px-5 shrink-0 sm:w-auto w-full">
                    <Search className="h-4 w-4 mr-1.5" />
                    Rechercher
                  </Button>
                </div>

                {userLocation && (
                  <p className="text-xs text-green-600 mt-1.5 ml-1">
                    Position détectée
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Types Section */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center mb-6 md:mb-8">
            Catégories
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {typeOptions.map((option) => {
              const opt = option as ActivityTypeOption
              const emoji = opt.emoji || option.label.split(" ")[0]
              const labelText = opt.emoji
                ? option.label.replace(/^[^\s]+\s/, "")
                : option.label.split(" ").slice(1).join(" ")
              return (
                <button
                  key={option.value}
                  onClick={() => router.push(`/recherche?type=${option.value}`)}
                  className="flex flex-col items-center py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  {opt.iconUrl ? (
                    <img
                      src={normalizeUploadUrl(opt.iconUrl)}
                      alt=""
                      className="h-8 w-8 object-contain mb-1.5"
                    />
                  ) : (
                    <span className="text-2xl mb-1.5">{emoji}</span>
                  )}
                  <span className="text-xs text-gray-600 text-center font-medium leading-tight group-hover:text-gray-900">
                    {labelText}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 md:py-14 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Vous êtes un établissement ?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Rejoignez notre plateforme et faites découvrir vos activités.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700"
              onClick={() => router.push("/auth/inscription")}
            >
              Créer un compte établissement
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

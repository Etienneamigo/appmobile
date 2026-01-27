"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_TYPE_OPTIONS, DISTANCE_OPTIONS } from "@/lib/constants"
import { MapPin, Search, Navigation, Loader2 } from "lucide-react"

interface HomePageClientProps {
  heroVideoDesktopUrl?: string | null
  heroVideoMobileUrl?: string | null
}

// Normalize upload URLs to use API route for proper MIME type handling
function normalizeUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

export function HomePageClient({ heroVideoDesktopUrl, heroVideoMobileUrl }: HomePageClientProps) {
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

  // Get the appropriate video URL based on device
  const videoUrl = isMobile ? heroVideoMobileUrl : heroVideoDesktopUrl
  // Fallback to desktop if mobile video is not set
  const finalVideoUrl = videoUrl || heroVideoDesktopUrl
  const hasVideo = !!finalVideoUrl

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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/90 to-primary py-20 md:py-32 overflow-hidden">
        {/* Video Background */}
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
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Qu&apos;est-ce qu&apos;on fait ce soir ?
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-white/90">
              Decouvrez les meilleures activites pres de chez vous
            </p>

            {/* Search Card */}
            <Card className="bg-white text-left">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="space-y-4">
                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Ou cherchez-vous ?
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Ville ou code postal"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value)
                            setUserLocation(null) // Clear geolocation when typing city
                          }}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGeolocation}
                        disabled={isGeolocating}
                        className="shrink-0"
                      >
                        {isGeolocating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline ml-2">
                          {userLocation ? "Localise" : "Me localiser"}
                        </span>
                      </Button>
                    </div>
                    {userLocation && (
                      <p className="text-xs text-green-600">
                        Position detectee
                      </p>
                    )}
                  </div>

                  {/* Type and Radius */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Type d&apos;activite
                      </label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les activites" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les activites</SelectItem>
                          {ACTIVITY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Rayon de recherche
                      </label>
                      <Select value={radius} onValueChange={setRadius}>
                        <SelectTrigger>
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
                    </div>
                  </div>

                  {/* Submit */}
                  <Button type="submit" size="lg" className="w-full">
                    <Search className="mr-2 h-5 w-5" />
                    Rechercher des activites
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Activity Types Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Decouvrez nos categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => router.push(`/recherche?type=${option.value}`)}
                className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border hover:border-primary"
              >
                <span className="text-4xl mb-2">{option.label.split(" ")[0]}</span>
                <span className="text-sm text-center font-medium">
                  {option.label.split(" ").slice(1).join(" ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Vous etes un etablissement ?
            </h2>
            <p className="text-muted-foreground mb-6">
              Rejoignez notre plateforme et faites decouvrir vos activites a des
              milliers d&apos;utilisateurs.
            </p>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/auth/inscription")}
            >
              Creer un compte etablissement
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

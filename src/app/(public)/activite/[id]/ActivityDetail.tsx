"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"
import { toggleFavorite } from "@/app/actions/favorites"
import { toast } from "sonner"
import {
  MapPin,
  Clock,
  Euro,
  Users,
  Heart,
  Navigation,
  Phone,
  Globe,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import type { Activity, Media, Establishment, Event } from "@prisma/client"
import { EventsCarousel } from "./EventsCarousel"

// Normalize upload URLs to use the API serving route
function normalizeUploadUrl(url: string): string {
  // If it's an old /uploads/ path, convert to /api/uploads/
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

const ActivityMap = dynamic(
  () => import("@/components/map/ActivityMap").then((mod) => mod.ActivityMap),
  { ssr: false, loading: () => <div className="h-64 bg-gray-200 rounded-lg animate-pulse" /> }
)

interface ActivityDetailProps {
  activity: Activity & {
    medias: Media[]
    establishment: Establishment
    events: Event[]
    _count: { favorites: number }
  }
  isFavorited: boolean
  isAuthenticated: boolean
  userId?: string
}

export function ActivityDetail({
  activity,
  isFavorited: initialFavorited,
  isAuthenticated,
  userId,
}: ActivityDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)

  const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]
  const images = activity.medias.filter((m) => m.kind === "IMAGE")
  // Prioritize uploaded video over external video link
  const uploadedVideo = activity.medias.find((m) => m.kind === "VIDEO_UPLOAD")
  const externalVideo = activity.medias.find((m) => m.kind === "VIDEO")

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`
  const osmUrl = `https://www.openstreetmap.org/directions?route=;${activity.lat},${activity.lng}`

  async function handleToggleFavorite() {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour ajouter aux favoris")
      return
    }

    setIsLoading(true)
    const result = await toggleFavorite(activity.id)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      setIsFavorited(result.isFavorited || false)
      toast.success(
        result.isFavorited ? "Ajouté aux favoris" : "Retiré des favoris"
      )
    }
  }

  function nextImage() {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  function prevImage() {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/recherche"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour à la recherche
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {typeInfo?.emoji} {typeInfo?.label || activity.type}
            </Badge>
            <h1 className="text-3xl font-bold">{activity.title}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {activity.address}, {activity.zipCode} {activity.city}
            </p>
          </div>
          <Button
            variant={isFavorited ? "default" : "outline"}
            onClick={handleToggleFavorite}
            disabled={isLoading}
          >
            <Heart
              className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`}
            />
            {isFavorited ? "Favori" : "Ajouter aux favoris"}
          </Button>
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="relative mb-8">
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={normalizeUploadUrl(images[currentImageIndex].url)}
                alt={`${activity.title} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex
                          ? "bg-white"
                          : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{activity.description}</p>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Informations pratiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {activity.durationMinutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Durée</p>
                        <p className="font-medium">{activity.durationMinutes} minutes</p>
                      </div>
                    </div>
                  )}

                  {activity.priceFrom && (
                    <div className="flex items-center gap-2">
                      <Euro className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prix</p>
                        <p className="font-medium">À partir de {activity.priceFrom}€</p>
                      </div>
                    </div>
                  )}

                  {(activity.minPeople || activity.maxPeople) && (
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Personnes</p>
                        <p className="font-medium">
                          {activity.minPeople || 1} - {activity.maxPeople || "∞"} personnes
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {activity.scheduleText && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Horaires</p>
                        <p className="whitespace-pre-wrap">{activity.scheduleText}</p>
                      </div>
                    </div>
                  </>
                )}

                {activity.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Video - prioritize uploaded video over external link */}
            {(uploadedVideo || externalVideo) && (
              <Card>
                <CardHeader>
                  <CardTitle>Vidéo</CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadedVideo ? (
                    <div className="aspect-video">
                      <video
                        src={normalizeUploadUrl(uploadedVideo.url)}
                        controls
                        className="w-full h-full rounded-lg bg-black"
                        preload="metadata"
                      >
                        Votre navigateur ne supporte pas la lecture de vidéos.
                      </video>
                    </div>
                  ) : externalVideo?.url.includes("youtube") || externalVideo?.url.includes("youtu.be") ? (
                    <div className="aspect-video">
                      <iframe
                        src={externalVideo.url.replace("watch?v=", "embed/")}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  ) : externalVideo ? (
                    <a
                      href={externalVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Voir la vidéo
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Localisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden mb-4">
                  <ActivityMap
                    activities={[{ ...activity, _count: { favorites: 0 } } as never]}
                    center={{ lat: activity.lat, lng: activity.lng }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-4 w-4 mr-2" />
                      Google Maps
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={osmUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-4 w-4 mr-2" />
                      OpenStreetMap
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            {activity.events.length > 0 && (
              <EventsCarousel events={activity.events} />
            )}

            {/* Establishment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Etablissement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-semibold">{activity.establishment.name}</p>

                {activity.establishment.phone && (
                  <a
                    href={`tel:${activity.establishment.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    {activity.establishment.phone}
                  </a>
                )}

                {activity.establishment.website && (
                  <a
                    href={activity.establishment.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                    Site web
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activity.establishment.bookingUrl && (
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <a href={activity.establishment.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <CalendarCheck className="h-4 w-4 mr-2" />
                      Reserver
                    </a>
                  </Button>
                )}
                <Button asChild variant={activity.establishment.bookingUrl ? "outline" : "default"} className="w-full">
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4 mr-2" />
                    Itineraire
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleToggleFavorite}
                  disabled={isLoading}
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`}
                  />
                  {isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

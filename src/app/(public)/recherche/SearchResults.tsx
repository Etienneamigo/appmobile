"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { searchActivities, geocodeCity, ActivityWithDistance } from "@/app/actions/search"
import { trackImpressions } from "@/app/actions/analytics"
import { ACTIVITY_TYPE_OPTIONS, DISTANCE_OPTIONS, ACTIVITY_TYPES, ActivityTypeKey } from "@/lib/constants"
import { formatDistance } from "@/lib/geo"
import { MapPin, Heart, Users, Clock, Euro, Search, Filter, List, Map } from "lucide-react"

// Dynamic import for the map to avoid SSR issues
const ActivityMap = dynamic(
  () => import("@/components/map/ActivityMap").then((mod) => mod.ActivityMap),
  { ssr: false, loading: () => <div className="h-96 bg-gray-200 rounded-lg animate-pulse" /> }
)

interface SearchResultsProps {
  params: {
    lat?: string
    lng?: string
    city?: string
    type?: string
    radius?: string
    minPeople?: string
    maxPeople?: string
    priceMax?: string
    sortBy?: string
    page?: string
  }
}

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

export function SearchResults({ params }: SearchResultsProps) {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityWithDistance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>()
  const [sessionId, setSessionId] = useState<string>("")

  // Initialize session ID on client
  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  // Filter states
  const [city, setCity] = useState(params.city || "")
  const [type, setType] = useState(params.type || "")
  const [radius, setRadius] = useState(params.radius || "10")
  const [minPeople, setMinPeople] = useState(params.minPeople || "")
  const [maxPeople, setMaxPeople] = useState(params.maxPeople || "")
  const [priceMax, setPriceMax] = useState(params.priceMax || "")
  const [sortBy, setSortBy] = useState(params.sortBy || "distance")

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)

    let lat = params.lat ? parseFloat(params.lat) : undefined
    let lng = params.lng ? parseFloat(params.lng) : undefined

    // If city is provided but no coordinates, geocode the city
    if (!lat && !lng && params.city) {
      const coords = await geocodeCity(params.city)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      }
    }

    if (lat && lng) {
      setCenter({ lat, lng })
    }

    const result = await searchActivities({
      lat,
      lng,
      city: params.city,
      type: params.type as "BOWLING" | "ESCAPE_GAME" | "BAR_DANSANT" | "KARAOKE" | "LASER_GAME" | "CINEMA" | "TRAMPOLINE_PARK" | undefined,
      radius: params.radius ? parseInt(params.radius) : 10,
      minPeople: params.minPeople ? parseInt(params.minPeople) : undefined,
      maxPeople: params.maxPeople ? parseInt(params.maxPeople) : undefined,
      priceMax: params.priceMax ? parseFloat(params.priceMax) : undefined,
      sortBy: (params.sortBy as "distance" | "popularity") || "distance",
      page: params.page ? parseInt(params.page) : 1,
    })

    setActivities(result.activities)
    setTotal(result.total)
    setIsLoading(false)
  }, [params])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Track impressions when activities are displayed
  useEffect(() => {
    if (activities.length > 0 && sessionId) {
      const activityIds = activities.map(a => a.id)
      trackImpressions(activityIds, sessionId)
    }
  }, [activities, sessionId])

  function handleSearch() {
    const searchParams = new URLSearchParams()

    if (params.lat) searchParams.set("lat", params.lat)
    if (params.lng) searchParams.set("lng", params.lng)
    if (city) searchParams.set("city", city)
    if (type && type !== "all") searchParams.set("type", type)
    if (radius) searchParams.set("radius", radius)
    if (minPeople) searchParams.set("minPeople", minPeople)
    if (maxPeople) searchParams.set("maxPeople", maxPeople)
    if (priceMax) searchParams.set("priceMax", priceMax)
    if (sortBy) searchParams.set("sortBy", sortBy)

    router.push(`/recherche?${searchParams.toString()}`)
  }

  function handleActivityClick(id: string) {
    router.push(`/activite/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isLoading ? "Recherche..." : `${total} activité${total > 1 ? "s" : ""} trouvée${total > 1 ? "s" : ""}`}
          </h1>
          {params.city && <p className="text-muted-foreground">à {params.city}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ville</label>
                <Input
                  placeholder="Paris, Lyon..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type d&apos;activité</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les activités</SelectItem>
                    {ACTIVITY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rayon</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Trier par</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="popularity">Popularité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Min personnes</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={minPeople}
                  onChange={(e) => setMinPeople(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max personnes</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={maxPeople}
                  onChange={(e) => setMaxPeople(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prix max (€)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="50"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Aucune activité trouvée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Essayez d&apos;élargir votre recherche ou de modifier les filtres
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "map" ? (
        <div className="h-[600px] rounded-lg overflow-hidden border">
          <ActivityMap
            activities={activities}
            center={center}
            onActivityClick={handleActivityClick}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity List */}
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>

          {/* Map (desktop only) */}
          <div className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)]">
            <div className="h-full rounded-lg overflow-hidden border">
              <ActivityMap
                activities={activities}
                center={center}
                onActivityClick={handleActivityClick}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityCard({ activity }: { activity: ActivityWithDistance }) {
  const typeInfo = ACTIVITY_TYPES[activity.type as ActivityTypeKey]
  const firstImage = activity.medias.find((m) => m.kind === "IMAGE")

  return (
    <Link href={`/activite/${activity.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <div className="flex">
            {/* Image */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-200">
              {firstImage ? (
                <img
                  src={firstImage.url}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {typeInfo?.emoji || "🎯"}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {typeInfo?.emoji} {typeInfo?.label || activity.type}
                    </Badge>
                    <h3 className="font-semibold line-clamp-1">{activity.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {activity.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {activity.city}
                </span>
                {activity.distance !== undefined && (
                  <span className="font-medium text-primary">
                    {formatDistance(activity.distance)}
                  </span>
                )}
                {activity.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activity.durationMinutes} min
                  </span>
                )}
                {activity.priceFrom && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
                    à partir de {activity.priceFrom}€
                  </span>
                )}
                {(activity.minPeople || activity.maxPeople) && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {activity.minPeople || 1}-{activity.maxPeople || "∞"} pers.
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

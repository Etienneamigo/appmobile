"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ACTIVITY_TYPE_OPTIONS_PLAIN, ZONE1_OPTIONS, ZONE2_OPTIONS, ZONE3_OPTIONS } from "@/lib/constants"
import { createActivity, updateActivity } from "@/app/actions/activities"
import { geocodeAddress } from "@/lib/geo"
import { toast } from "sonner"
import { MapPin, Loader2 } from "lucide-react"
import type { Activity, Media } from "@prisma/client"

interface ActivityFormProps {
  activity?: Activity & { medias: Media[] }
  mode: "create" | "edit"
  activityTypeOptions?: { value: string; label: string }[]
}

export function ActivityForm({ activity, mode, activityTypeOptions }: ActivityFormProps) {
  const typeOptions = activityTypeOptions || ACTIVITY_TYPE_OPTIONS_PLAIN
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [formData, setFormData] = useState({
    type: activity?.type || "",
    title: activity?.title || "",
    description: activity?.description || "",
    address: activity?.address || "",
    city: activity?.city || "",
    zipCode: activity?.zipCode || "",
    country: activity?.country || "France",
    lat: activity?.lat?.toString() || "",
    lng: activity?.lng?.toString() || "",
    minPeople: activity?.minPeople?.toString() || "",
    maxPeople: activity?.maxPeople?.toString() || "",
    durationMinutes: activity?.durationMinutes?.toString() || "",
    priceFrom: activity?.priceFrom?.toString() || "",
    scheduleText: activity?.scheduleText || "",
    tags: activity?.tags?.join(", ") || "",
    zone1Tags: activity?.zone1Tags || [],
    zone2Tags: activity?.zone2Tags || [],
    zone3Tags: activity?.zone3Tags || [],
    status: activity?.status || "DRAFT",
  })

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function toggleZoneTag(field: "zone1Tags" | "zone2Tags" | "zone3Tags", tag: string) {
    setFormData((prev) => {
      const current = prev[field]
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
      return { ...prev, [field]: next }
    })
  }

  async function handleGeocode() {
    const fullAddress = `${formData.address}, ${formData.zipCode} ${formData.city}, ${formData.country}`

    if (!formData.address || !formData.city) {
      toast.error("Veuillez remplir l'adresse et la ville")
      return
    }

    setIsGeocoding(true)
    const result = await geocodeAddress(fullAddress)
    setIsGeocoding(false)

    if (result) {
      setFormData((prev) => ({
        ...prev,
        lat: result.lat.toString(),
        lng: result.lng.toString(),
      }))
      toast.success("Coordonnées trouvées")
    } else {
      toast.error("Adresse non trouvée. Veuillez entrer les coordonnées manuellement.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const data = {
      type: formData.type,
      title: formData.title,
      description: formData.description,
      address: formData.address,
      city: formData.city,
      zipCode: formData.zipCode,
      country: formData.country,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      minPeople: formData.minPeople ? parseInt(formData.minPeople) : null,
      maxPeople: formData.maxPeople ? parseInt(formData.maxPeople) : null,
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
      priceFrom: formData.priceFrom ? parseFloat(formData.priceFrom) : null,
      scheduleText: formData.scheduleText || null,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      zone1Tags: formData.zone1Tags,
      zone2Tags: formData.zone2Tags,
      zone3Tags: formData.zone3Tags,
      status: formData.status as "DRAFT" | "PUBLISHED",
    }

    let result
    if (mode === "create") {
      result = await createActivity(data)
    } else {
      result = await updateActivity(activity!.id, data)
    }

    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(mode === "create" ? "Activité créée" : "Activité mise à jour")
      if (mode === "create") {
        router.push("/etablissement/dashboard")
      } else {
        router.refresh()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type d&apos;activité *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="PUBLISHED">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Ex: Bowling du Centre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Décrivez votre activité..."
              rows={4}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Localisation */}
      <Card>
        <CardHeader>
          <CardTitle>Localisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 rue de la Paix"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Paris"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Code postal *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                placeholder="75001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="France"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude *</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => handleChange("lat", e.target.value)}
                placeholder="48.8566"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude *</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => handleChange("lng", e.target.value)}
                placeholder="2.3522"
                required
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGeocode}
            disabled={isGeocoding}
          >
            {isGeocoding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            Géocoder l&apos;adresse
          </Button>
        </CardContent>
      </Card>

      {/* Détails */}
      <Card>
        <CardHeader>
          <CardTitle>Détails (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minPeople">Nombre de personnes min</Label>
              <Input
                id="minPeople"
                type="number"
                min="1"
                value={formData.minPeople}
                onChange={(e) => handleChange("minPeople", e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPeople">Nombre de personnes max</Label>
              <Input
                id="maxPeople"
                type="number"
                min="1"
                value={formData.maxPeople}
                onChange={(e) => handleChange("maxPeople", e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Durée moyenne (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) => handleChange("durationMinutes", e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceFrom">Prix à partir de (€)</Label>
              <Input
                id="priceFrom"
                type="number"
                min="0"
                step="0.01"
                value={formData.priceFrom}
                onChange={(e) => handleChange("priceFrom", e.target.value)}
                placeholder="15.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduleText">Horaires</Label>
            <Textarea
              id="scheduleText"
              value={formData.scheduleText}
              onChange={(e) => handleChange("scheduleText", e.target.value)}
              placeholder="Lundi - Vendredi : 10h - 22h&#10;Samedi - Dimanche : 9h - 00h"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              placeholder="famille, amis, soirée"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sous-catégories (zones) */}
      <Card>
        <CardHeader>
          <CardTitle>Sous-catégories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Pour qui ?</Label>
            <div className="flex flex-wrap gap-2">
              {ZONE1_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleZoneTag("zone1Tags", opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.zone1Tags.includes(opt.value)
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ambiance &amp; format</Label>
            <div className="flex flex-wrap gap-2">
              {ZONE2_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleZoneTag("zone2Tags", opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.zone2Tags.includes(opt.value)
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profil d&apos;intérêt</Label>
            <div className="flex flex-wrap gap-2">
              {ZONE3_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleZoneTag("zone3Tags", opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.zone3Tags.includes(opt.value)
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Création..." : "Mise à jour..."}
            </>
          ) : mode === "create" ? (
            "Créer l'activité"
          ) : (
            "Mettre à jour"
          )}
        </Button>
      </div>
    </form>
  )
}

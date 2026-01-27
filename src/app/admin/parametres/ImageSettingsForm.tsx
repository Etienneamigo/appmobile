"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { updateSiteSettings, deleteHeroImage } from "@/app/actions/admin"
import { toast } from "sonner"
import { Upload, Trash2, Monitor, Smartphone, Loader2, ImageIcon } from "lucide-react"

interface ImageSettingsFormProps {
  desktopUrl?: string | null
  mobileUrl?: string | null
  desktopName?: string | null
  mobileName?: string | null
}

// Normalize upload URLs to use API route for proper MIME type handling
function normalizeUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

export function ImageSettingsForm({
  desktopUrl,
  mobileUrl,
  desktopName,
  mobileName,
}: ImageSettingsFormProps) {
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)
  const [isDeletingDesktop, setIsDeletingDesktop] = useState(false)
  const [isDeletingMobile, setIsDeletingMobile] = useState(false)

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File, type: "desktop" | "mobile") {
    const setUploading = type === "desktop" ? setIsUploadingDesktop : setIsUploadingMobile

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez selectionner une image")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas depasser 10 Mo")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "image")

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || "Erreur upload")
      }

      const uploadData = await uploadResponse.json()

      // Update site settings with the new image URL
      const updateData = type === "desktop"
        ? { heroImageDesktopUrl: uploadData.url, heroImageDesktopName: file.name }
        : { heroImageMobileUrl: uploadData.url, heroImageMobileName: file.name }

      const result = await updateSiteSettings(updateData)

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(`Image ${type === "desktop" ? "desktop" : "mobile"} mise a jour`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(type: "desktop" | "mobile") {
    const setDeleting = type === "desktop" ? setIsDeletingDesktop : setIsDeletingMobile

    if (!confirm(`Etes-vous sur de vouloir supprimer l'image ${type === "desktop" ? "desktop" : "mobile"} ?`)) {
      return
    }

    setDeleting(true)

    try {
      const result = await deleteHeroImage(type)

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(`Image ${type === "desktop" ? "desktop" : "mobile"} supprimee`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Desktop Image */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <h3 className="font-medium">Image Desktop</h3>
          </div>

          {desktopUrl ? (
            <div className="space-y-3">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={normalizeUploadUrl(desktopUrl)}
                  alt="Image desktop"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {desktopName || "Image desktop"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => desktopInputRef.current?.click()}
                  disabled={isUploadingDesktop}
                >
                  {isUploadingDesktop ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Remplacer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete("desktop")}
                  disabled={isDeletingDesktop}
                >
                  {isDeletingDesktop ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => desktopInputRef.current?.click()}
            >
              {isUploadingDesktop ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP - max 10Mo</p>
                </>
              )}
            </div>
          )}

          <input
            ref={desktopInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file, "desktop")
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>

      {/* Mobile Image */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <h3 className="font-medium">Image Mobile</h3>
          </div>

          {mobileUrl ? (
            <div className="space-y-3">
              <div className="aspect-[9/16] max-h-64 mx-auto bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={normalizeUploadUrl(mobileUrl)}
                  alt="Image mobile"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground truncate text-center">
                {mobileName || "Image mobile"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => mobileInputRef.current?.click()}
                  disabled={isUploadingMobile}
                >
                  {isUploadingMobile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Remplacer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete("mobile")}
                  disabled={isDeletingMobile}
                >
                  {isDeletingMobile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="aspect-[9/16] max-h-64 mx-auto border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => mobileInputRef.current?.click()}
            >
              {isUploadingMobile ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP - max 10Mo</p>
                </>
              )}
            </div>
          )}

          <input
            ref={mobileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file, "mobile")
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

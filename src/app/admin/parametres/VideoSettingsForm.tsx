"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { updateSiteSettings, deleteHeroVideo } from "@/app/actions/admin"
import { toast } from "sonner"
import { Upload, Trash2, Monitor, Smartphone, Loader2 } from "lucide-react"

interface VideoSettingsFormProps {
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

export function VideoSettingsForm({
  desktopUrl,
  mobileUrl,
  desktopName,
  mobileName,
}: VideoSettingsFormProps) {
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)
  const [isDeletingDesktop, setIsDeletingDesktop] = useState(false)
  const [isDeletingMobile, setIsDeletingMobile] = useState(false)

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File, type: "desktop" | "mobile") {
    const setUploading = type === "desktop" ? setIsUploadingDesktop : setIsUploadingMobile

    // Validate file
    if (!file.type.startsWith("video/")) {
      toast.error("Veuillez selectionner un fichier video")
      return
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas depasser 30 Mo")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "video")

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || "Erreur upload")
      }

      const uploadData = await uploadResponse.json()

      // Update site settings with the new video URL
      const updateData = type === "desktop"
        ? { heroVideoDesktopUrl: uploadData.url, heroVideoDesktopName: file.name }
        : { heroVideoMobileUrl: uploadData.url, heroVideoMobileName: file.name }

      const result = await updateSiteSettings(updateData)

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(`Video ${type === "desktop" ? "desktop" : "mobile"} mise a jour`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(type: "desktop" | "mobile") {
    const setDeleting = type === "desktop" ? setIsDeletingDesktop : setIsDeletingMobile

    if (!confirm(`Etes-vous sur de vouloir supprimer la video ${type === "desktop" ? "desktop" : "mobile"} ?`)) {
      return
    }

    setDeleting(true)

    try {
      const result = await deleteHeroVideo(type)

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(`Video ${type === "desktop" ? "desktop" : "mobile"} supprimee`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Desktop Video */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <h3 className="font-medium">Video Desktop</h3>
          </div>

          {desktopUrl ? (
            <div className="space-y-3">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={normalizeUploadUrl(desktopUrl)}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {desktopName || "Video desktop"}
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
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                  <p className="text-xs text-muted-foreground">MP4, WebM - max 30Mo</p>
                </>
              )}
            </div>
          )}

          <input
            ref={desktopInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file, "desktop")
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>

      {/* Mobile Video */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <h3 className="font-medium">Video Mobile</h3>
          </div>

          {mobileUrl ? (
            <div className="space-y-3">
              <div className="aspect-[9/16] max-h-64 mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  src={normalizeUploadUrl(mobileUrl)}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              </div>
              <p className="text-sm text-muted-foreground truncate text-center">
                {mobileName || "Video mobile"}
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
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                  <p className="text-xs text-muted-foreground">MP4, WebM - max 30Mo</p>
                </>
              )}
            </div>
          )}

          <input
            ref={mobileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
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

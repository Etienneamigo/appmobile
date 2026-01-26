"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addMediaToActivity, deleteMedia } from "@/app/actions/activities"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Upload, Trash2, Image, Video, Loader2, Link as LinkIcon } from "lucide-react"
import type { Media } from "@prisma/client"

interface MediaManagerProps {
  activityId: string
  medias: Media[]
}

export function MediaManager({ activityId, medias }: MediaManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [isAddingVideo, setIsAddingVideo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const images = medias.filter((m) => m.kind === "IMAGE")
  const videos = medias.filter((m) => m.kind === "VIDEO")

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setIsUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || "Erreur lors de l'upload")
          continue
        }

        const result = await addMediaToActivity(activityId, data.url, data.kind)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("Image ajoutée")
        }
      } catch {
        toast.error("Erreur lors de l'upload")
      }
    }

    setIsUploading(false)
    router.refresh()

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleAddVideoUrl() {
    if (!videoUrl.trim()) return

    setIsAddingVideo(true)
    const result = await addMediaToActivity(activityId, videoUrl, "VIDEO")
    setIsAddingVideo(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Vidéo ajoutée")
      setVideoUrl("")
      router.refresh()
    }
  }

  async function handleDeleteMedia(id: string) {
    const result = await deleteMedia(id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Média supprimé")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Images */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Image className="h-4 w-4" />
            Images ({images.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Ajouter des images
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((media) => (
              <div key={media.id} className="relative group">
                <img
                  src={media.url}
                  alt=""
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(media.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune image</p>
        )}
      </div>

      {/* Vidéo */}
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Video className="h-4 w-4" />
          Vidéo ({videos.length})
        </Label>

        {videos.length > 0 ? (
          <div className="space-y-2">
            {videos.map((media) => (
              <div
                key={media.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="text-sm truncate flex-1">{media.url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMedia(media.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="URL de la vidéo (YouTube, Vimeo...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddVideoUrl}
              disabled={isAddingVideo || !videoUrl.trim()}
            >
              {isAddingVideo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

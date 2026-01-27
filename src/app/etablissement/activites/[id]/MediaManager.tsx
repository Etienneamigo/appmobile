"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addMediaToActivity, deleteMedia } from "@/app/actions/activities"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Upload, Trash2, Image, Video, Loader2, Link as LinkIcon, FileVideo, AlertCircle } from "lucide-react"
import type { Media } from "@prisma/client"

interface MediaManagerProps {
  activityId: string
  medias: Media[]
}

const MAX_VIDEO_SIZE_MB = 30
const RECOMMENDED_VIDEO_DURATION = { min: 10, max: 14 }

export function MediaManager({ activityId, medias }: MediaManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [isAddingVideo, setIsAddingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const images = medias.filter((m) => m.kind === "IMAGE")
  const uploadedVideo = medias.find((m) => m.kind === "VIDEO_UPLOAD")
  const externalVideos = medias.filter((m) => m.kind === "VIDEO")

  // Vérifier la durée de la vidéo côté client
  async function checkVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.onerror = () => {
        resolve(null)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

        const result = await addMediaToActivity(activityId, data.url, data.kind, data.fileName, data.fileSize)

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

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier la taille
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      toast.error(`La vidéo est trop volumineuse. Maximum: ${MAX_VIDEO_SIZE_MB}MB`)
      return
    }

    // Vérifier le type
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      toast.error("Format non supporté. Utilisez MP4 ou WebM.")
      return
    }

    // Vérifier la durée (optionnel - warning seulement)
    setUploadProgress("Vérification de la vidéo...")
    const duration = await checkVideoDuration(file)
    if (duration !== null) {
      if (duration < RECOMMENDED_VIDEO_DURATION.min) {
        toast.warning(`Vidéo très courte (${Math.round(duration)}s). Durée recommandée: ${RECOMMENDED_VIDEO_DURATION.min}-${RECOMMENDED_VIDEO_DURATION.max}s`)
      } else if (duration > RECOMMENDED_VIDEO_DURATION.max) {
        toast.warning(`Vidéo longue (${Math.round(duration)}s). Durée recommandée: ${RECOMMENDED_VIDEO_DURATION.min}-${RECOMMENDED_VIDEO_DURATION.max}s`)
      }
    }

    setIsUploadingVideo(true)
    setUploadProgress("Upload en cours...")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", "video")

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur lors de l'upload")
        setIsUploadingVideo(false)
        setUploadProgress(null)
        return
      }

      setUploadProgress("Enregistrement...")

      const result = await addMediaToActivity(
        activityId,
        data.url,
        "VIDEO_UPLOAD",
        data.fileName,
        data.fileSize
      )

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Vidéo uploadée avec succès")
        router.refresh()
      }
    } catch {
      toast.error("Erreur lors de l'upload")
    }

    setIsUploadingVideo(false)
    setUploadProgress(null)

    if (videoInputRef.current) {
      videoInputRef.current.value = ""
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
      toast.success("Lien vidéo ajouté")
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
    <div className="space-y-8">
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageUpload}
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

      {/* Vidéo uploadée */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <FileVideo className="h-4 w-4" />
            Vidéo de présentation
          </Label>
          {!uploadedVideo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadingVideo}
            >
              {isUploadingVideo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress || "Upload..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader une vidéo
                </>
              )}
            </Button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Formats: MP4, WebM | Max: {MAX_VIDEO_SIZE_MB}MB | Durée recommandée: {RECOMMENDED_VIDEO_DURATION.min}-{RECOMMENDED_VIDEO_DURATION.max}s
        </div>

        {uploadedVideo ? (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                src={uploadedVideo.url}
                controls
                className="w-full max-h-64"
                preload="metadata"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {uploadedVideo.fileName || "Vidéo uploadée"}
                {uploadedVideo.fileSize && (
                  <span className="ml-2">
                    ({(uploadedVideo.fileSize / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploadingVideo}
                >
                  Remplacer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMedia(uploadedVideo.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
          >
            {isUploadingVideo ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{uploadProgress}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileVideo className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez ou déposez une vidéo ici
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liens vidéo externes */}
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Video className="h-4 w-4" />
          Liens vidéo externes ({externalVideos.length})
        </Label>

        {externalVideos.length > 0 && (
          <div className="space-y-2">
            {externalVideos.map((media) => (
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
        )}

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
      </div>
    </div>
  )
}

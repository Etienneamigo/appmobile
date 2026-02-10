"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addMediaToActivity, deleteMedia, setCoverMedia } from "@/app/actions/activities"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Upload, Trash2, Image, Video, Loader2, Link as LinkIcon, FileVideo, AlertCircle, Star } from "lucide-react"
import type { Media } from "@prisma/client"

interface MediaManagerProps {
  activityId: string
  medias: Media[]
  coverMediaId?: string | null
}

const MAX_VIDEO_SIZE_MB = 30
const RECOMMENDED_VIDEO_DURATION = { min: 10, max: 14 }

// Normalize upload URLs to use the API serving route
function normalizeUploadUrl(url: string): string {
  // If it's an old /uploads/ path, convert to /api/uploads/
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

export function MediaManager({ activityId, medias, coverMediaId }: MediaManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [isAddingVideo, setIsAddingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const images = medias.filter((m) => m.kind === "IMAGE")
  const uploadedVideos = medias.filter((m) => m.kind === "VIDEO_UPLOAD")
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
    const files = e.target.files
    if (!files?.length) return

    setIsUploadingVideo(true)

    for (const file of Array.from(files)) {
      // Vérifier la taille
      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > MAX_VIDEO_SIZE_MB) {
        toast.error(`La vidéo "${file.name}" est trop volumineuse. Maximum: ${MAX_VIDEO_SIZE_MB}MB`)
        continue
      }

      // Vérifier le type
      if (!["video/mp4", "video/webm"].includes(file.type)) {
        toast.error(`Format non supporté pour "${file.name}". Utilisez MP4 ou WebM.`)
        continue
      }

      // Vérifier la durée (optionnel - warning seulement)
      setUploadProgress(`Vérification de ${file.name}...`)
      const duration = await checkVideoDuration(file)
      if (duration !== null) {
        if (duration < RECOMMENDED_VIDEO_DURATION.min) {
          toast.warning(`Vidéo "${file.name}" très courte (${Math.round(duration)}s). Durée recommandée: ${RECOMMENDED_VIDEO_DURATION.min}-${RECOMMENDED_VIDEO_DURATION.max}s`)
        } else if (duration > RECOMMENDED_VIDEO_DURATION.max) {
          toast.warning(`Vidéo "${file.name}" longue (${Math.round(duration)}s). Durée recommandée: ${RECOMMENDED_VIDEO_DURATION.min}-${RECOMMENDED_VIDEO_DURATION.max}s`)
        }
      }

      try {
        // Step 1: Get direct upload URL from Cloudflare Stream
        setUploadProgress(`Préparation de ${file.name}...`)
        const duRes = await fetch("/api/cloudflare/stream/direct-upload", { method: "POST" })
        const duData = await duRes.json()

        if (!duRes.ok) {
          // Fallback to local upload if Cloudflare is not configured
          if (duRes.status === 500 && duData.error?.includes("non configuré")) {
            setUploadProgress(`Upload local de ${file.name}...`)
            await handleLocalVideoUpload(file)
            continue
          }
          toast.error(duData.error || `Erreur Cloudflare pour ${file.name}`)
          continue
        }

        // Step 2: Upload directly to Cloudflare
        setUploadProgress(`Upload de ${file.name}...`)
        const uploadForm = new FormData()
        uploadForm.append("file", file)

        const uploadRes = await fetch(duData.uploadURL, {
          method: "POST",
          body: uploadForm,
        })

        if (!uploadRes.ok) {
          toast.error(`Erreur lors de l'upload de ${file.name} vers Cloudflare`)
          continue
        }

        // Step 3: Attach the video to the activity in DB
        setUploadProgress(`Enregistrement de ${file.name}...`)

        // Retry attach (video processing may take a moment)
        let attachOk = false
        for (let attempt = 0; attempt < 6; attempt++) {
          const attachRes = await fetch("/api/cloudflare/stream/attach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              activityId,
              uid: duData.uid,
              fileName: file.name,
              fileSize: file.size,
            }),
          })

          if (attachRes.ok) {
            attachOk = true
            break
          }

          if (attachRes.status === 202) {
            setUploadProgress(`Traitement de ${file.name}... (${attempt + 1}/6)`)
            await new Promise((r) => setTimeout(r, 3000))
            continue
          }

          const attachData = await attachRes.json()
          toast.error(attachData.error || `Erreur enregistrement ${file.name}`)
          break
        }

        if (attachOk) {
          toast.success(`Vidéo "${file.name}" uploadée`)
        }
      } catch {
        toast.error(`Erreur lors de l'upload de ${file.name}`)
      }
    }

    setIsUploadingVideo(false)
    setUploadProgress(null)
    router.refresh()

    if (videoInputRef.current) {
      videoInputRef.current.value = ""
    }
  }

  // Fallback: upload video to local server (when Cloudflare is not configured)
  async function handleLocalVideoUpload(file: File) {
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
        toast.error(data.error || `Erreur lors de l'upload de ${file.name}`)
        return
      }

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
        toast.success(`Vidéo "${file.name}" uploadée (local)`)
      }
    } catch {
      toast.error(`Erreur lors de l'upload de ${file.name}`)
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

  async function handleSetCover(mediaId: string) {
    const result = await setCoverMedia(activityId, mediaId)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Couverture définie")
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
            {images.map((media) => {
              const isCover = coverMediaId === media.id
              return (
                <div key={media.id} className={`relative group rounded-lg overflow-hidden ${isCover ? "ring-2 ring-yellow-400" : ""}`}>
                  <img
                    src={normalizeUploadUrl(media.url)}
                    alt=""
                    className="w-full h-24 object-cover"
                  />
                  {isCover && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-semibold rounded">
                      Couverture
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(media.id)}
                        className="p-1 bg-yellow-400 text-yellow-900 rounded-full"
                        title="Définir comme couverture"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(media.id)}
                      className="p-1 bg-red-500 text-white rounded-full"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune image</p>
        )}
      </div>

      {/* Vidéos uploadées */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <FileVideo className="h-4 w-4" />
            Vidéos ({uploadedVideos.length})
          </Label>
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
                Ajouter des vidéos
              </>
            )}
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={handleVideoUpload}
          />
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Formats: MP4, WebM | Max: {MAX_VIDEO_SIZE_MB}MB | Durée recommandée: {RECOMMENDED_VIDEO_DURATION.min}-{RECOMMENDED_VIDEO_DURATION.max}s
        </div>

        {uploadedVideos.length > 0 ? (
          <div className="space-y-4">
            {uploadedVideos.map((video) => {
              const isCover = coverMediaId === video.id
              return (
                <div key={video.id} className="space-y-2">
                  <div className={`relative rounded-lg overflow-hidden bg-black ${isCover ? "ring-2 ring-yellow-400" : ""}`}>
                    <video
                      src={normalizeUploadUrl(video.url)}
                      controls
                      className="w-full max-h-64"
                      preload="metadata"
                    >
                      Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                    {isCover && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-semibold rounded">
                        Couverture
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {video.fileName || "Vidéo uploadée"}
                      {video.fileSize && (
                        <span className="ml-2">
                          ({(video.fileSize / (1024 * 1024)).toFixed(1)}MB)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {!isCover && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetCover(video.id)}
                          title="Définir comme couverture"
                        >
                          <Star className="h-4 w-4 text-yellow-500" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMedia(video.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
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
                  Cliquez ou déposez des vidéos ici
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

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react"
import { StreamHlsVideo } from "@/components/video/StreamHlsVideo"
import { normalizeUploadUrl, isHlsUrl } from "@/lib/video-utils"
import type { Media } from "@prisma/client"

interface MediaGridProps {
  medias: Media[]
}

export function MediaGrid({ medias }: MediaGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const selectedMedia = selectedIndex !== null ? medias[selectedIndex] : null
  const isVideo = selectedMedia?.kind === "VIDEO_UPLOAD" || selectedMedia?.kind === "VIDEO"

  const goToPrev = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : medias.length - 1)
  }, [selectedIndex, medias.length])

  const goToNext = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex < medias.length - 1 ? selectedIndex + 1 : 0)
  }, [selectedIndex, medias.length])

  const close = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  // Keyboard navigation in modal
  useEffect(() => {
    if (selectedIndex === null) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") goToPrev()
      else if (e.key === "ArrowRight") goToNext()
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [selectedIndex, close, goToPrev, goToNext])

  // Auto-play when video changes in modal
  useEffect(() => {
    if (selectedMedia && isVideo && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [selectedMedia, isVideo])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedIndex])

  if (medias.length === 0) return null

  return (
    <>
      {/* 3-column thumbnail grid */}
      <div className="grid grid-cols-3 gap-1">
        {medias.map((media, index) => {
          const mediaIsVideo = media.kind === "VIDEO_UPLOAD" || media.kind === "VIDEO"
          return (
            <button
              key={media.id}
              onClick={() => setSelectedIndex(index)}
              className="relative aspect-[9/16] bg-gray-100 overflow-hidden group cursor-pointer"
            >
              {mediaIsVideo ? (
                isHlsUrl(media.url) ? (
                  <StreamHlsVideo
                    src={media.url}
                    poster={media.thumbnailUrl ? normalizeUploadUrl(media.thumbnailUrl) : undefined}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <video
                    src={normalizeUploadUrl(media.url)}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                )
              ) : (
                <img
                  src={normalizeUploadUrl(media.url)}
                  alt={media.title || ""}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {/* Play icon for videos */}
              {mediaIsVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-7 w-7 text-white opacity-80 drop-shadow-lg" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Fullscreen modal viewer */}
      {selectedMedia && selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 text-white/70 text-sm">
            {selectedIndex + 1} / {medias.length}
          </div>

          {/* Mute toggle (videos only) */}
          {isVideo && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </button>
          )}

          {/* Prev/Next arrows */}
          {medias.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-8 w-8 text-white" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-8 w-8 text-white" />
              </button>
            </>
          )}

          {/* Content viewer */}
          <div className="w-full max-w-lg mx-auto px-4">
            {isVideo ? (
              selectedMedia.kind === "VIDEO_UPLOAD" ? (
                isHlsUrl(selectedMedia.url) ? (
                  <StreamHlsVideo
                    ref={videoRef}
                    key={selectedMedia.id}
                    src={selectedMedia.url}
                    poster={selectedMedia.thumbnailUrl ? normalizeUploadUrl(selectedMedia.thumbnailUrl) : undefined}
                    controls
                    autoPlay
                    muted={isMuted}
                    playsInline
                    className="w-full max-h-[85vh] rounded-lg bg-black"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={selectedMedia.id}
                    src={normalizeUploadUrl(selectedMedia.url)}
                    controls
                    autoPlay
                    muted={isMuted}
                    playsInline
                    className="w-full max-h-[85vh] rounded-lg bg-black"
                  >
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                )
              ) : selectedMedia.url.includes("youtube") || selectedMedia.url.includes("youtu.be") ? (
                <div className="aspect-video">
                  <iframe
                    src={selectedMedia.url.replace("watch?v=", "embed/") + "?autoplay=1"}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                    allow="autoplay"
                  />
                </div>
              ) : (
                <div className="text-center text-white">
                  <a
                    href={selectedMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white/80"
                  >
                    Ouvrir la vidéo externe
                  </a>
                </div>
              )
            ) : (
              <img
                src={normalizeUploadUrl(selectedMedia.url)}
                alt={selectedMedia.title || ""}
                className="w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

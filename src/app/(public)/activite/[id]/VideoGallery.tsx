"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react"
import { StreamHlsVideo } from "@/components/video/StreamHlsVideo"
import { normalizeUploadUrl, isHlsUrl } from "@/lib/video-utils"
import type { Media } from "@prisma/client"

interface VideoGalleryProps {
  videos: Media[]
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const selectedVideo = selectedIndex !== null ? videos[selectedIndex] : null

  const goToPrev = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : videos.length - 1)
  }, [selectedIndex, videos.length])

  const goToNext = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex < videos.length - 1 ? selectedIndex + 1 : 0)
  }, [selectedIndex, videos.length])

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
    if (selectedVideo && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [selectedVideo])

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

  if (videos.length === 0) return null

  return (
    <>
      {/* 3-column thumbnail grid */}
      <div className="grid grid-cols-3 gap-2">
        {videos.map((video, index) => (
          <button
            key={video.id}
            onClick={() => setSelectedIndex(index)}
            className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden group cursor-pointer"
          >
            {isHlsUrl(video.url) ? (
              <StreamHlsVideo
                src={video.url}
                poster={video.thumbnailUrl ? normalizeUploadUrl(video.thumbnailUrl) : undefined}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
              />
            ) : (
              <video
                src={normalizeUploadUrl(video.url)}
                className="w-full h-full object-cover"
                preload="metadata"
                muted
                playsInline
              />
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <Play className="h-8 w-8 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Title/filename */}
            {(video.title || video.fileName) && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-xs text-white truncate">
                  {video.title || video.fileName}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Fullscreen modal viewer */}
      {selectedVideo && selectedIndex !== null && (
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
            {selectedIndex + 1} / {videos.length}
          </div>

          {/* Mute toggle */}
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

          {/* Prev/Next arrows */}
          {videos.length > 1 && (
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

          {/* Video player */}
          <div className="w-full max-w-lg mx-auto px-4">
            {selectedVideo.kind === "VIDEO_UPLOAD" ? (
              isHlsUrl(selectedVideo.url) ? (
                <StreamHlsVideo
                  ref={videoRef}
                  key={selectedVideo.id}
                  src={selectedVideo.url}
                  poster={selectedVideo.thumbnailUrl ? normalizeUploadUrl(selectedVideo.thumbnailUrl) : undefined}
                  controls
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="w-full max-h-[85vh] rounded-lg bg-black"
                />
              ) : (
                <video
                  ref={videoRef}
                  key={selectedVideo.id}
                  src={normalizeUploadUrl(selectedVideo.url)}
                  controls
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="w-full max-h-[85vh] rounded-lg bg-black"
                >
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              )
            ) : selectedVideo.url.includes("youtube") || selectedVideo.url.includes("youtu.be") ? (
              <div className="aspect-video">
                <iframe
                  src={selectedVideo.url.replace("watch?v=", "embed/") + "?autoplay=1"}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="text-center text-white">
                <a
                  href={selectedVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white/80"
                >
                  Ouvrir la vidéo externe
                </a>
              </div>
            )}

            {/* Video info */}
            {(selectedVideo.title || selectedVideo.fileName) && (
              <p className="text-white/80 text-sm mt-3 text-center">
                {selectedVideo.title || selectedVideo.fileName}
                {selectedVideo.fileSize && (
                  <span className="text-white/50 ml-2">
                    ({(selectedVideo.fileSize / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

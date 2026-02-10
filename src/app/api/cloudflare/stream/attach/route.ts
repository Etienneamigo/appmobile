import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const role = session.user.role
  const establishmentId = session.user.establishmentId
  if (role !== "ADMIN" && (role !== "ESTABLISHMENT" || !establishmentId)) {
    return NextResponse.json(
      { error: "Seuls les établissements et administrateurs peuvent uploader" },
      { status: 403 }
    )
  }

  // Env check
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare non configuré" },
      { status: 500 }
    )
  }

  let body: {
    activityId: string
    uid: string
    fileName?: string
    fileSize?: number
    title?: string
    videoCategory?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 })
  }

  const { activityId, uid, fileName, fileSize, title, videoCategory } = body

  if (!activityId || !uid) {
    return NextResponse.json({ error: "activityId et uid requis" }, { status: 400 })
  }

  // Verify activity ownership (unless admin)
  if (role !== "ADMIN") {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, establishmentId: establishmentId! },
    })
    if (!activity) {
      return NextResponse.json({ error: "Activité non trouvée" }, { status: 404 })
    }
  }

  try {
    // Poll Cloudflare for video details (video might still be processing)
    // We retry a few times with delay since the video may not be ready immediately
    let cfVideo: {
      playback?: { hls?: string }
      thumbnail?: string
      duration?: number
      status?: { state?: string }
    } | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const cfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      )

      const cfData = await cfResponse.json()

      if (cfData.success && cfData.result) {
        cfVideo = cfData.result
        // If we have playback URLs, we're good
        if (cfVideo?.playback?.hls) {
          break
        }
      }

      // Wait before retry (video may still be processing)
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    if (!cfVideo) {
      return NextResponse.json(
        { error: "Impossible de récupérer les infos vidéo Cloudflare" },
        { status: 502 }
      )
    }

    // Use HLS URL for maximum compatibility (mobile + web)
    const hlsUrl = cfVideo.playback?.hls || ""
    const thumbnailUrl = cfVideo.thumbnail || null
    const duration = cfVideo.duration ? Math.round(cfVideo.duration) : null

    if (!hlsUrl) {
      // Video might still be processing, store the uid-based URL as fallback
      // Cloudflare HLS URL format: https://customer-{code}.cloudflarestream.com/{uid}/manifest/video.m3u8
      // We can construct it, but it's safer to just note it's pending
      return NextResponse.json(
        { error: "Vidéo en cours de traitement, réessayez dans quelques secondes" },
        { status: 202 }
      )
    }

    // Create Media record in DB
    const media = await prisma.media.create({
      data: {
        activityId,
        kind: "VIDEO_UPLOAD",
        url: hlsUrl,
        thumbnailUrl,
        duration,
        fileName: fileName || null,
        fileSize: fileSize || null,
        title: title || null,
        videoCategory: videoCategory || null,
      },
    })

    revalidatePath(`/etablissement/activites/${activityId}`)
    revalidatePath(`/activite/${activityId}`)
    revalidatePath("/etablissement/dashboard")

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Cloudflare Stream attach error:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }
}

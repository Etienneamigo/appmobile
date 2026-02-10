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
  const accountHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
  const variant = process.env.CLOUDFLARE_IMAGES_VARIANT || "public"
  if (!accountHash) {
    return NextResponse.json(
      { error: "CLOUDFLARE_IMAGES_ACCOUNT_HASH non configuré" },
      { status: 500 }
    )
  }

  let body: {
    activityId: string
    id: string // Cloudflare image ID
    fileName?: string
    fileSize?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 })
  }

  const { activityId, id, fileName, fileSize } = body

  if (!activityId || !id) {
    return NextResponse.json({ error: "activityId et id requis" }, { status: 400 })
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
    // Build the imagedelivery.net URL
    const url = `https://imagedelivery.net/${accountHash}/${id}/${variant}`

    // Create Media record in DB
    const media = await prisma.media.create({
      data: {
        activityId,
        kind: "IMAGE",
        url,
        fileName: fileName || null,
        fileSize: fileSize || null,
        cloudflareImageId: id,
      },
    })

    revalidatePath(`/etablissement/activites/${activityId}`)
    revalidatePath(`/activite/${activityId}`)
    revalidatePath("/etablissement/dashboard")

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Cloudflare Images attach error:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }
}

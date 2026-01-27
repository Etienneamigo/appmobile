import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024 // 30MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"]

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.establishmentId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const uploadType = formData.get("type") as string | null // "image" ou "video"

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Déterminer le type de fichier
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, GIF pour les images; MP4, WebM pour les vidéos." },
        { status: 400 }
      )
    }

    // Vérifier la taille selon le type
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return NextResponse.json(
        { error: `Le fichier est trop volumineux (max ${maxSizeMB}MB pour les ${isVideo ? 'vidéos' : 'images'})` },
        { status: 400 }
      )
    }

    // Générer un nom de fichier unique
    const ext = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4")
    const fileName = `${randomUUID()}.${ext}`

    // Créer le dossier uploads approprié
    const subDir = isVideo ? "videos" : "images"
    const uploadDir = path.join(process.cwd(), "public", "uploads", subDir)
    await mkdir(uploadDir, { recursive: true })

    // Écrire le fichier
    const filePath = path.join(uploadDir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Retourner l'URL via l'API de serving (pour avoir les bons MIME types)
    const url = `/api/uploads/${subDir}/${fileName}`

    return NextResponse.json({
      url,
      kind: isVideo ? "VIDEO_UPLOAD" : "IMAGE",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    )
  }
}

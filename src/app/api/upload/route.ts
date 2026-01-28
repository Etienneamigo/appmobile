import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { validateFile, sanitizeFilename, isAllowedMimeType } from "@/lib/file-validation"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request)
  const rateLimit = await checkRateLimit(clientIP, "upload")
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const session = await auth()

  // Allow establishments and admins to upload
  const isAdmin = session?.user?.role === "ADMIN"
  const isEstablishment = !!session?.user?.establishmentId

  if (!isAdmin && !isEstablishment) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const uploadType = formData.get("type") as string | null // "image" ou "video"

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Determine file category from MIME type
    const isImage = isAllowedMimeType(file.type, "image")
    const isVideo = isAllowedMimeType(file.type, "video")

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error:
            "Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, GIF pour les images; MP4, WebM pour les vidéos.",
        },
        { status: 400 }
      )
    }

    const category = isVideo ? "video" : "image"

    // Complete validation (type, size, magic bytes)
    const validation = await validateFile(file, category)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate safe filename
    const originalName = sanitizeFilename(file.name)
    const ext = originalName.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4")
    const fileName = `${randomUUID()}.${ext}`

    // Create upload directory
    const subDir = isVideo ? "videos" : "images"
    const uploadDir = path.join(process.cwd(), "public", "uploads", subDir)
    await mkdir(uploadDir, { recursive: true })

    // Write the file
    const filePath = path.join(uploadDir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Return URL via API serving route (for proper MIME types)
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
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { validateFile, sanitizeFilename, isAllowedMimeType } from "@/lib/file-validation"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { optionalMobileAuth, type MobileUser } from "@/lib/mobile-auth"

// Unified user type for auth check
interface AuthUser {
  role: string
  establishmentId: string | null
}

/**
 * Get authenticated user from either NextAuth session or mobile JWT
 * Returns null if neither auth method succeeds
 */
async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 1. Try NextAuth session first (web)
  const session = await auth()
  if (session?.user) {
    return {
      role: session.user.role || "USER",
      establishmentId: session.user.establishmentId || null,
    }
  }

  // 2. Fallback to mobile JWT
  const mobileUser = await optionalMobileAuth(request)
  if (mobileUser) {
    return {
      role: mobileUser.role,
      establishmentId: mobileUser.establishmentId,
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request)
  const rateLimit = await checkRateLimit(clientIP, "upload")
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  // Get user from either web session or mobile token
  const user = await getAuthUser(request)

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  // Allow establishments and admins to upload
  const isAdmin = user.role === "ADMIN"
  const isEstablishment = user.role === "ESTABLISHMENT" && !!user.establishmentId

  if (!isAdmin && !isEstablishment) {
    return NextResponse.json(
      { error: "Seuls les établissements et administrateurs peuvent uploader" },
      { status: 403 }
    )
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

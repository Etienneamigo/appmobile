import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"
import { validateUploadPath } from "@/lib/file-validation"

// MIME types for allowed file extensions only
const MIME_TYPES: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
}

function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  return MIME_TYPES[ext] || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Validate path segments
    const pathValidation = validateUploadPath(pathSegments)
    if (!pathValidation.valid) {
      console.warn(`[Upload Serve] Path validation failed: ${pathValidation.error}`)
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Build the full file path using sanitized path
    const uploadsRoot = path.join(process.cwd(), "public", "uploads")
    const filePath = path.join(uploadsRoot, pathValidation.sanitizedPath!)

    // Double-check the resolved path stays within uploads directory
    const resolvedPath = path.resolve(filePath)
    const resolvedRoot = path.resolve(uploadsRoot)
    if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
      console.warn(`[Upload Serve] Path escape attempt: ${resolvedPath}`)
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Check MIME type (only serve known types)
    const mimeType = getMimeType(filePath)
    if (!mimeType) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 403 })
    }

    // Check if file exists
    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: "Not a file" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        // Security headers
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        // Restrict cross-origin to same-site only (videos may need CORS for some players)
        "Cross-Origin-Resource-Policy": "same-site",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ error: "Error serving file" }, { status: 500 })
  }
}

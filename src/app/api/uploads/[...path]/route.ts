import { NextRequest, NextResponse } from "next/server"
import { readFile, stat, open } from "fs/promises"
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
  svg: "image/svg+xml",
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

    // Check if file exists and get size
    let fileStat
    try {
      fileStat = await stat(filePath)
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: "Not a file" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileSize = fileStat.size
    const rangeHeader = request.headers.get("range")

    // Common security/cache headers
    const commonHeaders: Record<string, string> = {
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "same-site",
      "Cache-Control": "public, max-age=31536000, immutable",
    }

    // Handle Range requests (required for HTML5 video playback)
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        // Default to 1MB chunks if no end specified
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)

        if (start >= fileSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          })
        }

        const clampedEnd = Math.min(end, fileSize - 1)
        const chunkSize = clampedEnd - start + 1

        const fileHandle = await open(filePath, "r")
        const buffer = Buffer.alloc(chunkSize)
        await fileHandle.read(buffer, 0, chunkSize, start)
        await fileHandle.close()

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            ...commonHeaders,
            "Content-Type": mimeType,
            "Content-Length": chunkSize.toString(),
            "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
            "Accept-Ranges": "bytes",
          },
        })
      }
    }

    // Full file response (non-range)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ error: "Error serving file" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"

// MIME types for common file extensions
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
  ogg: "video/ogg",
  mov: "video/quicktime",
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  return MIME_TYPES[ext] || "application/octet-stream"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Reconstruct the file path from segments
    const relativePath = pathSegments.join("/")

    // Security: prevent directory traversal attacks
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Build the full file path
    const filePath = path.join(process.cwd(), "public", "uploads", relativePath)

    // Check if file exists
    try {
      await stat(filePath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Get MIME type
    const mimeType = getMimeType(filePath)

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        // Allow cross-origin for videos
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Error serving file" },
      { status: 500 }
    )
  }
}

/**
 * File validation utilities
 * Magic bytes validation, MIME type checking, and size limits
 */

// Magic bytes signatures for allowed file types
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  // Images
  "image/jpeg": [
    { bytes: [0xff, 0xd8, 0xff] }, // JPEG
  ],
  "image/png": [
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  ],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
    // WebP also has WEBP at offset 8, but RIFF is enough with extension check
  ],

  // Videos
  "video/mp4": [
    { bytes: [0x00, 0x00, 0x00], offset: 0 }, // ftyp box (size varies)
    // Common MP4 signatures - check for 'ftyp' at offset 4
  ],
  "video/webm": [
    { bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // EBML header (WebM/MKV)
  ],
  "video/quicktime": [
    { bytes: [0x00, 0x00, 0x00], offset: 0 }, // MOV uses same ftyp structure
  ],
}

// Additional validation for MP4/MOV files (check for 'ftyp' marker)
const MP4_FTYP_MARKER = [0x66, 0x74, 0x79, 0x70] // 'ftyp' ASCII

/**
 * Validate file magic bytes match the claimed MIME type
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType]

  if (!signatures) {
    // Unknown type - reject by default
    return false
  }

  // Special handling for MP4/MOV - check for 'ftyp' at offset 4
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    // ftyp box: [size (4 bytes)][ftyp (4 bytes)][brand...]
    // Check if 'ftyp' exists at offset 4
    if (buffer.length < 8) return false
    const hasFtyp = MP4_FTYP_MARKER.every((byte, i) => buffer[4 + i] === byte)
    if (hasFtyp) return true

    // Also check for 'moov' or 'mdat' at start (rare but valid)
    const moov = [0x6d, 0x6f, 0x6f, 0x76]
    const mdat = [0x6d, 0x64, 0x61, 0x74]
    const hasMoov = moov.every((byte, i) => buffer[4 + i] === byte)
    const hasMdat = mdat.every((byte, i) => buffer[4 + i] === byte)
    return hasMoov || hasMdat
  }

  // Check standard signatures
  for (const sig of signatures) {
    const offset = sig.offset || 0
    if (buffer.length < offset + sig.bytes.length) continue

    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte)
    if (matches) return true
  }

  return false
}

/**
 * Allowed file types configuration
 */
export const ALLOWED_TYPES = {
  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] as string[],
    extensions: ["jpg", "jpeg", "png", "webp", "gif"] as string[],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  video: {
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"] as string[],
    extensions: ["mp4", "webm", "mov"] as string[],
    maxSize: 30 * 1024 * 1024, // 30MB
  },
}

/**
 * Check if a MIME type is allowed for a category
 */
export function isAllowedMimeType(mimeType: string, category: "image" | "video"): boolean {
  return ALLOWED_TYPES[category].mimeTypes.includes(mimeType)
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

/**
 * Validate file type based on MIME type and extension
 */
export function validateFileType(
  file: { name: string; type: string },
  category: "image" | "video"
): { valid: boolean; error?: string } {
  const config = ALLOWED_TYPES[category]
  const extension = getFileExtension(file.name)

  // Check extension
  if (!config.extensions.includes(extension)) {
    return {
      valid: false,
      error: `Extension non autorisée. Extensions acceptées : ${config.extensions.join(", ")}`,
    }
  }

  // Check MIME type
  if (!config.mimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Type MIME non autorisé. Types acceptés : ${config.mimeTypes.join(", ")}`,
    }
  }

  return { valid: true }
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  category: "image" | "video"
): { valid: boolean; error?: string } {
  const maxSize = ALLOWED_TYPES[category].maxSize
  const maxSizeMB = maxSize / (1024 * 1024)

  if (size > maxSize) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux (max ${maxSizeMB}MB pour les ${category === "video" ? "vidéos" : "images"})`,
    }
  }

  return { valid: true }
}

/**
 * Complete file validation
 */
export async function validateFile(
  file: File,
  category: "image" | "video"
): Promise<{ valid: boolean; error?: string }> {
  // 1. Validate type (extension + MIME)
  const typeResult = validateFileType(file, category)
  if (!typeResult.valid) return typeResult

  // 2. Validate size
  const sizeResult = validateFileSize(file.size, category)
  if (!sizeResult.valid) return sizeResult

  // 3. Validate magic bytes
  const buffer = Buffer.from(await file.arrayBuffer())

  // Need at least 12 bytes for magic byte validation
  if (buffer.length < 12) {
    return { valid: false, error: "Fichier trop petit ou corrompu" }
  }

  if (!validateMagicBytes(buffer, file.type)) {
    return {
      valid: false,
      error: "Le contenu du fichier ne correspond pas à son type déclaré",
    }
  }

  return { valid: true }
}

/**
 * Sanitize filename - remove dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const name = filename.split(/[/\\]/).pop() || "file"

  // Remove dangerous characters, keep only safe ones
  const sanitized = name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".") // No double dots
    .replace(/^\./, "_") // No leading dot
    .substring(0, 200) // Max length

  return sanitized || "file"
}

/**
 * Validate upload path - prevent directory traversal
 */
export function validateUploadPath(pathSegments: string[]): {
  valid: boolean
  error?: string
  sanitizedPath?: string
} {
  // Check each segment
  for (const segment of pathSegments) {
    // No empty segments
    if (!segment || segment.trim() === "") {
      return { valid: false, error: "Invalid path segment" }
    }

    // No parent directory references
    if (segment === ".." || segment.includes("..")) {
      return { valid: false, error: "Path traversal not allowed" }
    }

    // No absolute paths
    if (segment.startsWith("/") || segment.startsWith("\\")) {
      return { valid: false, error: "Absolute paths not allowed" }
    }

    // No hidden files
    if (segment.startsWith(".")) {
      return { valid: false, error: "Hidden files not allowed" }
    }

    // Only allowed directories for first segment
    if (pathSegments.indexOf(segment) === 0) {
      if (!["images", "videos"].includes(segment)) {
        return { valid: false, error: "Invalid upload directory" }
      }
    }

    // Validate filename characters
    if (!/^[a-zA-Z0-9._-]+$/.test(segment)) {
      return { valid: false, error: "Invalid characters in path" }
    }
  }

  return {
    valid: true,
    sanitizedPath: pathSegments.join("/"),
  }
}

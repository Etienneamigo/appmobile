/**
 * Check if a URL is an HLS stream (Cloudflare Stream or any .m3u8)
 */
export function isHlsUrl(url: string): boolean {
  return url.includes(".m3u8") || url.includes("cloudflarestream.com")
}

/**
 * Normalize upload URLs: convert old /uploads/ paths to /api/uploads/
 */
export function normalizeUploadUrl(url: string): string {
  if (url.startsWith("/uploads/")) {
    return url.replace("/uploads/", "/api/uploads/")
  }
  return url
}

const BASE_URL = 'https://maisonapee.com';

/**
 * Normalize media URLs for display.
 * - Absolute URLs (http/https): use as-is
 * - Old /uploads/ paths: convert to /api/uploads/ and prepend base URL
 * - Relative paths: prepend base URL
 * - Cloudflare imagedelivery.net URLs: use as-is
 * - Cloudflare stream URLs: use as-is
 */
export function normalizeMediaUrl(url: string): string {
  if (!url) return '';

  // Already absolute URL (Cloudflare, external)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Old /uploads/ path -> /api/uploads/
  if (url.startsWith('/uploads/')) {
    return `${BASE_URL}${url.replace('/uploads/', '/api/uploads/')}`;
  }

  // Other relative paths
  return `${BASE_URL}${url}`;
}

/**
 * Check if a URL is an HLS stream (Cloudflare Stream or .m3u8)
 */
export function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('cloudflarestream.com');
}

/**
 * Check if a URL is a Cloudflare Images URL
 */
export function isCloudflareImageUrl(url: string): boolean {
  return url.includes('imagedelivery.net');
}

/**
 * Get thumbnail URL for a video media
 */
export function getVideoThumbnail(media: { thumbnailUrl?: string | null; url: string }): string | undefined {
  if (media.thumbnailUrl) {
    return normalizeMediaUrl(media.thumbnailUrl);
  }
  return undefined;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format duration in seconds for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Max video size in bytes (30MB, matching web)
 */
export const MAX_VIDEO_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_SIZE_MB = 30;

import { config } from '../config';

/**
 * Normalize media URLs:
 * - /uploads/xxx → BASE_URL/api/uploads/xxx
 * - /api/xxx → BASE_URL/api/xxx
 * - https://... → as-is
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `${config.BASE_URL}${url.replace('/uploads/', '/api/uploads/')}`;
  }
  return `${config.BASE_URL}${url}`;
}

/** Format distance in km to readable string */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Calculate distance between two points (Haversine) */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

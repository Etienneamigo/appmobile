export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'https://wadelo.com';

export const withApiBaseUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return pathOrUrl;

  // already absolute
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // ensure leading slash
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE_URL}${path}`;
};

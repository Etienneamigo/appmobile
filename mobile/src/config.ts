// Centralized configuration
// Uses EXPO_PUBLIC_ env vars for runtime overrides

const getEnv = (key: string, fallback: string): string => {
  // @ts-ignore - Expo env vars
  const val = process.env[key];
  return val || fallback;
};

export const config = {
  BASE_URL: getEnv('EXPO_PUBLIC_API_BASE_URL', 'https://wadelo.com'),
  APP_NAME: 'Wadelo',
  APP_VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 20,
  MAX_MEDIAS: 10,
  DEFAULT_RADIUS_KM: 10,
  SEARCH_DEBOUNCE_MS: 500,
  FEED_PAGE_SIZE: 10,
  HOME_SECTION_LIMIT: 10,
  MARSEILLE_LAT: 43.2965,
  MARSEILLE_LNG: 5.3698,
};

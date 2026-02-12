// Design System - Clean Minimal Theme
// Matches web SaaS style: black/gray primary, white backgrounds, subtle borders

export const colors = {
  // Primary palette - Gray-900 based (matches web's primary buttons)
  primary: {
    main: '#18181B', // gray-900
    light: '#3F3F46', // gray-700
    dark: '#09090B', // gray-950
    contrast: '#FFFFFF',
  },

  // Secondary - Indigo for special accents (Wadelo branding)
  secondary: {
    main: '#6366F1',
    light: '#818CF8',
    dark: '#4F46E5',
    contrast: '#FFFFFF',
  },

  // Success
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },

  // Warning
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },

  // Error
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },

  // Neutral/Gray scale
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F4F4F5',
    elevated: '#FFFFFF',
    dark: '#18181B',
  },

  // Text colors
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    tertiary: '#71717A',
    disabled: '#A1A1AA',
    inverse: '#FFFFFF',
  },

  // Gradients
  gradients: {
    primary: ['#18181B', '#3F3F46'],
    secondary: ['#6366F1', '#818CF8'],
    hero: ['#18181B', '#27272A', '#3F3F46'],
    card: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
    dark: ['#18181B', '#27272A'],
  },

  // Overlay
  overlay: {
    light: 'rgba(255, 255, 255, 0.7)',
    medium: 'rgba(255, 255, 255, 0.5)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.7)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const typography = {
  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font weights
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  // Colored shadows for cards
  primary: {
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Activity type emojis (matching web)
export const ACTIVITY_EMOJIS: Record<string, string> = {
  BOWLING: '🎳',
  ESCAPE_GAME: '🔐',
  BAR_DANSANT: '💃',
  KARAOKE: '🎤',
  LASER_GAME: '🔫',
  CINEMA: '🎬',
  TRAMPOLINE_PARK: '🤸',
  KARTING: '🏎️',
  REALITE_VIRTUELLE: '🥽',
  QUIZ_GAME: '🧩',
  MINIGOLF: '⛳',
  ESCALADE: '🧗',
  PATINOIRE: '⛸️',
  SPA_BIEN_ETRE: '🧖',
  ATELIER: '🎨',
  DEGUSTATION: '🍷',
  COMEDY_CLUB: '🎭',
  MUSEE_EXPO: '🏛️',
  CONCERT_SPECTACLE: '🎵',
};

// Helper to get emoji for activity type
export const getActivityEmoji = (type: string): string => {
  return ACTIVITY_EMOJIS[type] || '🎯';
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  animation,
  ACTIVITY_EMOJIS,
  getActivityEmoji,
};

// Design System - Dark Premium Theme
// Clean, modern, high-contrast dark UI with indigo accents

export const colors = {
  // Primary palette - Indigo accent
  primary: {
    main: '#818CF8',
    light: '#A5B4FC',
    dark: '#6366F1',
    contrast: '#FFFFFF',
  },

  // Secondary - Cyan accent for highlights
  secondary: {
    main: '#22D3EE',
    light: '#67E8F9',
    dark: '#06B6D4',
    contrast: '#FFFFFF',
  },

  // Success
  success: {
    main: '#34D399',
    light: '#6EE7B7',
    dark: '#10B981',
  },

  // Warning
  warning: {
    main: '#FBBF24',
    light: '#FDE68A',
    dark: '#F59E0B',
  },

  // Error
  error: {
    main: '#F87171',
    light: '#FCA5A5',
    dark: '#EF4444',
  },

  // Neutral/Gray scale (zinc-based)
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

  // Backgrounds (dark-first)
  background: {
    primary: '#09090B',
    secondary: '#111114',
    tertiary: '#18181B',
    elevated: '#1C1C22',
    surface: '#232330',
  },

  // Text colors (for dark backgrounds)
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    disabled: '#52525B',
    inverse: '#09090B',
  },

  // Borders
  border: {
    default: '#27272A',
    subtle: '#1F1F28',
    strong: '#3F3F46',
  },

  // Overlay
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.08)',
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

  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

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
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
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
};

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

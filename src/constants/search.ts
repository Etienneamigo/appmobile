// Search constants - matching web version

import { ActivityType, ACTIVITY_TYPE_LABELS } from '../types';

// Distance options in km (matching web)
export const DISTANCE_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
] as const;

export const DEFAULT_RADIUS_KM = 10;

// Activity type options for dropdown (V4 - extended list)
export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string; emoji: string }[] = [
  // Original types
  { value: 'BOWLING', label: 'Bowling', emoji: '🎳' },
  { value: 'ESCAPE_GAME', label: 'Escape Game', emoji: '🔐' },
  { value: 'BAR_DANSANT', label: 'Bar dansant', emoji: '💃' },
  { value: 'KARAOKE', label: 'Karaoke', emoji: '🎤' },
  { value: 'LASER_GAME', label: 'Laser Game', emoji: '🔫' },
  { value: 'CINEMA', label: 'Cinema', emoji: '🎬' },
  { value: 'TRAMPOLINE_PARK', label: 'Trampoline Park', emoji: '🤸' },
  // V4 new types
  { value: 'KARTING', label: 'Karting', emoji: '🏎️' },
  { value: 'REALITE_VIRTUELLE', label: 'Realite Virtuelle', emoji: '🥽' },
  { value: 'QUIZ_GAME', label: 'Quiz Game', emoji: '🧩' },
  { value: 'MINIGOLF', label: 'Minigolf', emoji: '⛳' },
  { value: 'ESCALADE', label: 'Escalade', emoji: '🧗' },
  { value: 'PATINOIRE', label: 'Patinoire', emoji: '⛸️' },
  { value: 'SPA_BIEN_ETRE', label: 'Spa & Bien-etre', emoji: '🧖' },
  { value: 'ATELIER', label: 'Atelier', emoji: '🎨' },
  { value: 'DEGUSTATION', label: 'Degustation', emoji: '🍷' },
  { value: 'COMEDY_CLUB', label: 'Comedy Club', emoji: '🎭' },
  { value: 'MUSEE_EXPO', label: 'Musee & Expo', emoji: '🏛️' },
  { value: 'CONCERT_SPECTACLE', label: 'Concert & Spectacle', emoji: '🎵' },
];

// Search state interface
export interface SearchFilters {
  city: string;
  lat: number | null;
  lng: number | null;
  type: ActivityType | null;
  radiusKm: number;
  hasGeolocation: boolean;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  city: '',
  lat: null,
  lng: null,
  type: null,
  radiusKm: DEFAULT_RADIUS_KM,
  hasGeolocation: false,
};

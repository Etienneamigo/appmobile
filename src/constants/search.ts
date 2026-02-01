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

// Activity type options for dropdown
export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string; emoji: string }[] = [
  { value: 'BOWLING', label: 'Bowling', emoji: '🎳' },
  { value: 'ESCAPE_GAME', label: 'Escape Game', emoji: '🔐' },
  { value: 'BAR_DANSANT', label: 'Bar dansant', emoji: '💃' },
  { value: 'KARAOKE', label: 'Karaoké', emoji: '🎤' },
  { value: 'LASER_GAME', label: 'Laser Game', emoji: '🔫' },
  { value: 'CINEMA', label: 'Cinéma', emoji: '🎬' },
  { value: 'TRAMPOLINE_PARK', label: 'Trampoline Park', emoji: '🤸' },
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

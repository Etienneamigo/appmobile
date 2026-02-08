// Fallback activity types (used when DB is unavailable)
// The source of truth is the ActivityTypeConfig table in the database
export const ACTIVITY_TYPES: Record<string, { label: string; emoji: string }> = {
  BOWLING: { label: "Bowling", emoji: "🎳" },
  ESCAPE_GAME: { label: "Escape Game", emoji: "🔐" },
  BAR_DANSANT: { label: "Bar dansant", emoji: "💃" },
  KARAOKE: { label: "Karaoké", emoji: "🎤" },
  LASER_GAME: { label: "Laser Game", emoji: "🔫" },
  CINEMA: { label: "Cinéma", emoji: "🎬" },
  TRAMPOLINE_PARK: { label: "Trampoline Park", emoji: "🤸" },
  KARTING: { label: "Karting", emoji: "🏎️" },
  REALITE_VIRTUELLE: { label: "Réalité virtuelle", emoji: "🥽" },
  QUIZ_GAME: { label: "Quiz Game", emoji: "🧩" },
  MINIGOLF: { label: "Minigolf", emoji: "⛳" },
  ESCALADE: { label: "Escalade", emoji: "🧗" },
  PATINOIRE: { label: "Patinoire", emoji: "⛸️" },
  SPA_BIEN_ETRE: { label: "Spa & Bien-être", emoji: "🧖" },
  ATELIER: { label: "Atelier", emoji: "🎨" },
  DEGUSTATION: { label: "Dégustation", emoji: "🍷" },
  COMEDY_CLUB: { label: "Comedy Club", emoji: "🎭" },
  MUSEE_EXPO: { label: "Musée & Expo", emoji: "🏛️" },
  CONCERT_SPECTACLE: { label: "Concert & Spectacle", emoji: "🎵" },
}

export type ActivityTypeKey = string

export const ACTIVITY_TYPE_OPTIONS = Object.entries(ACTIVITY_TYPES).map(([key, value]) => ({
  value: key,
  label: `${value.emoji} ${value.label}`,
}))

// Options sans emojis/icônes pour les dropdowns
export const ACTIVITY_TYPE_OPTIONS_PLAIN = Object.entries(ACTIVITY_TYPES).map(([key, value]) => ({
  value: key,
  label: value.label,
}))

export const DISTANCE_OPTIONS = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
]

export const VIDEO_CATEGORIES = [
  { value: "teaser", label: "Teaser" },
  { value: "ambiance", label: "Ambiance" },
  { value: "cours", label: "Cours / Tutorial" },
  { value: "evenement", label: "Événement" },
  { value: "autre", label: "Autre" },
]

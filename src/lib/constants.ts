export const ACTIVITY_TYPES = {
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

} as const

export type ActivityTypeKey = keyof typeof ACTIVITY_TYPES

export const ACTIVITY_TYPE_OPTIONS = Object.entries(ACTIVITY_TYPES).map(([key, value]) => ({
  value: key,
  label: `${value.emoji} ${value.label}`,
}))

export const DISTANCE_OPTIONS = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
]

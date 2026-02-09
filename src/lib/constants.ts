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

// Zone sub-categories
export const ZONE1_OPTIONS = [
  { value: "en-couple", label: "En couple" },
  { value: "en-famille", label: "En famille" },
  { value: "entre-amis", label: "Entre amis" },
  { value: "en-solo", label: "En solo" },
]

export const ZONE2_OPTIONS = [
  { value: "detente-chill", label: "Détente & chill" },
  { value: "immersif", label: "Immersif" },
  { value: "ludique", label: "Ludique" },
  { value: "after-work", label: "After-work" },
  { value: "soiree", label: "Soirée" },
]

export const ZONE3_OPTIONS = [
  { value: "sportif", label: "Pour les sportifs" },
  { value: "creatifs", label: "Pour les créatifs" },
  { value: "gourmands", label: "Pour les gourmands" },
  { value: "culture", label: "Pour les amateurs de culture" },
]

export const ZONE_CONFIGS = [
  { key: "zone1" as const, title: "Pour qui ?", field: "zone1Tags" as const, options: ZONE1_OPTIONS },
  { key: "zone2" as const, title: "Ambiance & format", field: "zone2Tags" as const, options: ZONE2_OPTIONS },
  { key: "zone3" as const, title: "Profils", field: "zone3Tags" as const, options: ZONE3_OPTIONS },
]

export const ZONE4_OPTIONS = [
  { value: "nouveautes", label: "Nouveautés" },
  { value: "coup-de-coeur", label: "Coup de coeur" },
]

export function getCategoryLabel(slug: string): string {
  const all = [...ZONE1_OPTIONS, ...ZONE2_OPTIONS, ...ZONE3_OPTIONS]
  const found = all.find(o => o.value === slug)
  if (found) return found.label
  if (slug === "nouveautes") return "Nouveautés"
  if (slug === "coup-de-coeur") return "Coup de coeur"
  return slug
}

export const VIDEO_CATEGORIES = [
  { value: "teaser", label: "Teaser" },
  { value: "ambiance", label: "Ambiance" },
  { value: "cours", label: "Cours / Tutorial" },
  { value: "evenement", label: "Événement" },
  { value: "autre", label: "Autre" },
]

// User roles
export type UserRole = 'USER' | 'ESTABLISHMENT' | 'ADMIN';

// Activity types - matching all 19 types from the SaaS backend
export type ActivityType =
  | 'BOWLING'
  | 'ESCAPE_GAME'
  | 'BAR_DANSANT'
  | 'KARAOKE'
  | 'LASER_GAME'
  | 'CINEMA'
  | 'TRAMPOLINE_PARK'
  | 'KARTING'
  | 'REALITE_VIRTUELLE'
  | 'QUIZ_GAME'
  | 'MINIGOLF'
  | 'ESCALADE'
  | 'PATINOIRE'
  | 'SPA_BIEN_ETRE'
  | 'ATELIER'
  | 'DEGUSTATION'
  | 'COMEDY_CLUB'
  | 'MUSEE_EXPO'
  | 'CONCERT_SPECTACLE';

// Activity status
export type ActivityStatus = 'DRAFT' | 'PUBLISHED';

// Media kind
export type MediaKind = 'IMAGE' | 'VIDEO' | 'VIDEO_UPLOAD';

// Subscription status
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE';

// User model
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  establishmentId: string | null;
}

// Login
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Register
export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  message: string;
}

// API Error
export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, string[]>;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Media
export interface Media {
  id: string;
  kind: MediaKind;
  url: string;
  fileName: string | null;
  fileSize?: number | null;
  videoCategory?: string | null;
  thumbnailUrl?: string | null;
  sortOrder?: number;
  createdAt?: string;
}

// Activity (list view)
export interface ActivityListItem {
  id: string;
  title: string;
  type: ActivityType;
  city: string;
  address: string;
  priceFrom: number | null;
  durationMinutes: number | null;
  minPeople: number | null;
  maxPeople: number | null;
  tags: string[];
  lat: number;
  lng: number;
  imageUrl: string | null;
  establishmentName: string;
  bookingUrl: string | null;
  isFavorite: boolean;
  adminPick?: boolean;
  verifiedAt?: string | null;
}

// Activity (detail view)
export interface ActivityDetail {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
  minPeople: number | null;
  maxPeople: number | null;
  durationMinutes: number | null;
  priceFrom: number | null;
  scheduleText: string | null;
  tags: string[];
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  viewCount: number;
  createdAt: string;
  medias: Media[];
  establishment: {
    id: string;
    name: string;
    phone: string | null;
    website: string | null;
    bookingUrl: string | null;
    verifiedAt?: string | null;
    // Accessibility fields
    accessWheelchair?: boolean;
    accessToilets?: boolean;
    accessParking?: boolean;
    accessElevator?: boolean;
    accessLevelEntry?: boolean;
  };
  isFavorite: boolean;
  adminPick?: boolean;
  verifiedAt?: string | null;
}

// Establishment
export interface Establishment {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  // Accessibility
  accessWheelchair?: boolean;
  accessToilets?: boolean;
  accessParking?: boolean;
  accessElevator?: boolean;
  accessLevelEntry?: boolean;
  subscription: {
    status: SubscriptionStatus | null;
    isTrialing: boolean;
    isActive: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  activity: {
    id: string;
    title: string;
    status: ActivityStatus;
    viewCount: number;
    favoritesCount: number;
  } | null;
}

// My Activity (establishment view with full details)
export interface MyActivity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
  minPeople: number | null;
  maxPeople: number | null;
  durationMinutes: number | null;
  priceFrom: number | null;
  scheduleText: string | null;
  tags: string[];
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  status: ActivityStatus;
  viewCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
  medias: Media[];
}

// Admin stats
export interface AdminStats {
  counts: {
    totalUsers: number;
    totalEstablishments: number;
    totalActivities: number;
    publishedActivities: number;
    draftActivities: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
  };
  recent: {
    usersLast7Days: number;
    activitiesLast7Days: number;
  };
  topActivities: {
    id: string;
    title: string;
    type: ActivityType;
    city: string;
    viewCount: number;
    establishmentName: string;
  }[];
}

// Favorite item
export interface FavoriteItem extends ActivityListItem {
  favoritedAt: string;
}

// Upload response
export interface UploadResponse {
  url: string;
  kind: MediaKind;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// ─── Reservation Native Types ─────────────────────────────────────────────────

export type ReservationStatus = 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';

export type ResourceSelectionMode = 'HIDDEN' | 'PICK_RESOURCE_FIRST' | 'PICK_TIME_FIRST';

export type CustomFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT' | 'PHONE' | 'EMAIL' | 'CHECKBOX';

export interface ReservationSettings {
  id: string;
  establishmentId: string;
  enabled: boolean;
  showExternalLinkAlso: boolean;
  timezone: string;
  slotDurationMinutes: number;
  capacityPerSlot: number;
  minPartySize: number;
  maxPartySize: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  cancellationEnabled: boolean;
  cancellationDeadlineHours: number;
  confirmationMessage: string | null;
  cancellationPolicyText: string | null;
  resourceSelectionMode: ResourceSelectionMode;
  customFieldDefs: ReservationCustomFieldDef[];
}

export interface ReservationCustomFieldDef {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  optionsJson: string[] | null;
  order: number;
}

export interface ReservationResource {
  id: string;
  establishmentId: string;
  name: string;
  capacity: number;
  isActive: boolean;
  description: string | null;
  imageUrl: string | null;
  useCustomRules: boolean;
  minPartySizeOverride: number | null;
  maxPartySizeOverride: number | null;
  slotDurationMinutesOverride: number | null;
  bookingWindowDaysOverride: number | null;
}

export interface SlotInfo {
  startAt: string;
  endAt: string;
  remainingCapacity: number;
  isAvailable: boolean;
  slotId?: string;
  resourceId?: string;
  resourceName?: string;
  isPersisted?: boolean;
}

export interface Reservation {
  id: string;
  settingsId: string;
  establishmentId: string;
  userId: string | null;
  slotId: string | null;
  resourceId: string | null;
  startAt: string;
  endAt: string;
  partySize: number;
  status: ReservationStatus;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  cancelledAt: string | null;
  createdAt: string;
  establishment: {
    name: string;
    address: string | null;
    city: string | null;
    activity: { id: string; title: string; type: string } | null;
  };
  settings: {
    cancellationEnabled: boolean;
    cancellationDeadlineHours: number;
  };
  slot: { id: string; startAt: string; endAt: string } | null;
  resource: { name: string } | null;
}

export interface CreateReservationPayload {
  establishmentId: string;
  startAt: string; // ISO string
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customFieldValues?: Record<string, string>;
  slotId?: string | null;
  resourceId?: string | null;
}

export interface AvailableResourceForSlot {
  id: string;
  name: string;
  remainingCapacity: number;
  description: string | null;
  imageUrl: string | null;
}

// ─── Accessibility ─────────────────────────────────────────────────────────────

export interface AccessibilityInfo {
  accessWheelchair: boolean;
  accessToilets: boolean;
  accessParking: boolean;
  accessElevator: boolean;
  accessLevelEntry: boolean;
}

// Activity type labels (for display) - all 19 types
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  BOWLING: 'Bowling',
  ESCAPE_GAME: 'Escape Game',
  BAR_DANSANT: 'Bar/pub/club',
  KARAOKE: 'Karaoke',
  LASER_GAME: 'Laser Game',
  CINEMA: 'Cinema',
  TRAMPOLINE_PARK: 'Trampoline Park',
  KARTING: 'Karting',
  REALITE_VIRTUELLE: 'Realite virtuelle',
  QUIZ_GAME: 'Quiz Game',
  MINIGOLF: 'Minigolf',
  ESCALADE: 'Escalade',
  PATINOIRE: 'Patinoire',
  SPA_BIEN_ETRE: 'Spa & Bien-etre',
  ATELIER: 'Atelier',
  DEGUSTATION: 'Degustation',
  COMEDY_CLUB: 'Comedy Club',
  MUSEE_EXPO: 'Musee & Expo',
  CONCERT_SPECTACLE: 'Concert & Spectacle',
};

// All activity type keys
export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'CINEMA',
  'TRAMPOLINE_PARK',
  'KARTING',
  'REALITE_VIRTUELLE',
  'QUIZ_GAME',
  'MINIGOLF',
  'ESCALADE',
  'PATINOIRE',
  'SPA_BIEN_ETRE',
  'ATELIER',
  'DEGUSTATION',
  'COMEDY_CLUB',
  'MUSEE_EXPO',
  'CONCERT_SPECTACLE',
];

// User roles
export type UserRole = 'USER' | 'ESTABLISHMENT' | 'ADMIN';

// Activity types - now dynamic from DB, but keep known ones for type safety
export type ActivityType = string;

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

// Verification request status
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Zone tags (matching web Prisma schema)
export const ZONE1_TAGS = ['en-couple', 'en-famille', 'entre-amis', 'en-solo'] as const;
export const ZONE2_TAGS = ['detente-chill', 'immersif', 'ludique', 'after-work', 'soiree'] as const;
export const ZONE3_TAGS = ['sportif', 'creatifs', 'gourmands', 'culture'] as const;

export type Zone1Tag = typeof ZONE1_TAGS[number];
export type Zone2Tag = typeof ZONE2_TAGS[number];
export type Zone3Tag = typeof ZONE3_TAGS[number];

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

// Media (aligned with web Prisma schema)
export interface Media {
  id: string;
  kind: MediaKind;
  url: string;
  fileName: string | null;
  fileSize?: number | null;
  cloudflareImageId?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  sortOrder?: number;
  videoCategory?: string | null;
  title?: string | null;
  createdAt?: string;
}

// Activity (list view - aligned with web)
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
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  lat: number;
  lng: number;
  imageUrl: string | null;
  coverMediaId?: string | null;
  establishmentName: string;
  bookingUrl: string | null;
  isFavorite: boolean;
  adminPick?: boolean;
  viewCount?: number;
  favoritesCount?: number;
  distance?: number;
}

// Activity (detail view - aligned with web)
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
  adminPick?: boolean;
  coverMediaId?: string | null;
  createdAt: string;
  medias: Media[];
  establishment: {
    id: string;
    name: string;
    phone: string | null;
    website: string | null;
    bookingUrl: string | null;
    verifiedAt?: string | null;
  };
  events?: Event[];
  isFavorite: boolean;
}

// Event (aligned with web Prisma schema)
export interface Event {
  id: string;
  activityId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
}

// Establishment (aligned with web)
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
  verifiedAt?: string | null;
  createdAt: string;
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
  coverMediaId?: string | null;
  adminPick?: boolean;
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

// Cloudflare Images direct upload response
export interface CloudflareDirectUploadResponse {
  uploadURL: string;
  id: string;
}

// Feed video item
export interface FeedVideo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  videoCategory: string | null;
  duration: number | null;
  activity: {
    id: string;
    title: string;
    type: string;
    city: string;
    establishment: {
      id: string;
      name: string;
    };
  };
}

// Feed response
export interface FeedResponse {
  items: FeedVideo[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Verification request
export interface VerificationRequest {
  id: string;
  establishmentId: string;
  status: VerificationStatus;
  documents: string[];
  message?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

// Geolocation
export interface GeoLocation {
  latitude: number;
  longitude: number;
  cityName: string | null;
}

// Activity type config (from DB)
export interface ActivityTypeConfig {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  iconUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

// Activity type labels (for display - static fallback)
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  BOWLING: 'Bowling',
  ESCAPE_GAME: 'Escape Game',
  BAR_DANSANT: 'Bar Dansant',
  KARAOKE: 'Karaoke',
  LASER_GAME: 'Laser Game',
  CINEMA: 'Cinéma',
  TRAMPOLINE_PARK: 'Trampoline Park',
};

// Zone tag labels
export const ZONE_TAG_LABELS: Record<string, string> = {
  'en-couple': 'En couple',
  'en-famille': 'En famille',
  'entre-amis': 'Entre amis',
  'en-solo': 'En solo',
  'detente-chill': 'Détente & Chill',
  'immersif': 'Immersif',
  'ludique': 'Ludique',
  'after-work': 'After-work',
  'soiree': 'Soirée',
  'sportif': 'Sportif',
  'creatifs': 'Créatifs',
  'gourmands': 'Gourmands',
  'culture': 'Culture',
};

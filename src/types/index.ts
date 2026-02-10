// User roles
export type UserRole = 'USER' | 'ESTABLISHMENT' | 'ADMIN';

// Activity types - now dynamic (string slugs from ActivityTypeConfig)
// Keep union for known types, but allow any string for dynamic types
export type ActivityType =
  | 'BOWLING'
  | 'ESCAPE_GAME'
  | 'BAR_DANSANT'
  | 'KARAOKE'
  | 'LASER_GAME'
  | 'CINEMA'
  | 'TRAMPOLINE_PARK'
  | (string & {});

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

// Media (aligned with Prisma schema - includes Cloudflare fields)
export interface Media {
  id: string;
  kind: MediaKind;
  url: string;
  fileName: string | null;
  fileSize?: number | null;
  videoCategory?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  cloudflareImageId?: string | null;
  sortOrder?: number;
  createdAt?: string;
}

// Event (calendar events per activity)
export interface Event {
  id: string;
  activityId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  coverMediaId?: string | null;
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  viewCount: number;
  createdAt: string;
  medias: Media[];
  events?: Event[];
  establishment: {
    id: string;
    name: string;
    phone: string | null;
    website: string | null;
    bookingUrl: string | null;
  };
  isFavorite: boolean;
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

// My Activity (establishment view with full details - aligned with web)
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
  coverMediaId?: string | null;
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  status: ActivityStatus;
  viewCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
  medias: Media[];
  events?: Event[];
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

// Cloudflare direct upload responses
export interface CloudflareImageDirectUpload {
  uploadURL: string;
  id: string;
}

export interface CloudflareStreamDirectUpload {
  uploadURL: string;
  uid: string;
}

// Feed video (for TikTok-style video feed)
export interface FeedVideo {
  id: string;
  url: string;
  kind: string;
  title: string | null;
  videoCategory: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  fileName: string | null;
  createdAt: string;
  activity: {
    id: string;
    title: string;
    type: string;
    city: string;
    lat: number;
    lng: number;
  };
  establishment: {
    id: string;
    name: string;
    city: string | null;
  };
}

// Activity type config (dynamic types from admin)
export interface ActivityTypeConfig {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

// Activity type labels (for display - fallback for known types)
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  BOWLING: 'Bowling',
  ESCAPE_GAME: 'Escape Game',
  BAR_DANSANT: 'Bar Dansant',
  KARAOKE: 'Karaoke',
  LASER_GAME: 'Laser Game',
  CINEMA: 'Cinéma',
  TRAMPOLINE_PARK: 'Trampoline Park',
};

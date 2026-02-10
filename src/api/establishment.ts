import { apiClient } from './client';
import {
  Establishment,
  MyActivity,
  Media,
  UploadResponse,
  MediaKind,
  CloudflareImageDirectUpload,
  CloudflareStreamDirectUpload,
  Event,
} from '../types';

// Backend returns objects directly, not wrapped in { data: ... }

interface MessageResponse {
  message: string;
}

interface UpdateEstablishmentData {
  name?: string;
  phone?: string | null;
  website?: string | null;
  bookingUrl?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
}

interface UpdateActivityData {
  title?: string;
  description?: string;
  type?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  minPeople?: number | null;
  maxPeople?: number | null;
  durationMinutes?: number | null;
  priceFrom?: number | null;
  scheduleText?: string | null;
  tags?: string[];
  zone1Tags?: string[];
  zone2Tags?: string[];
  zone3Tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export const establishmentApi = {
  // Establishment - returns Establishment directly
  get(): Promise<Establishment> {
    return apiClient.get<Establishment>('/api/mobile/establishment');
  },

  update(data: UpdateEstablishmentData): Promise<Establishment> {
    return apiClient.patch<Establishment>('/api/mobile/establishment', data);
  },

  // Activity - returns MyActivity directly (or null)
  getActivity(): Promise<MyActivity | null> {
    return apiClient.get<MyActivity | null>('/api/mobile/establishment/activity');
  },

  updateActivity(data: UpdateActivityData): Promise<{ message: string; data: { id: string; title: string; status: string; updatedAt: string } }> {
    return apiClient.patch('/api/mobile/establishment/activity', data);
  },

  // Media - the API returns { items: Media[] }
  async getMedias(): Promise<Media[]> {
    const result = await apiClient.get<{ items: Media[] }>('/api/mobile/establishment/media');
    return result.items || [];
  },

  addMedia(data: {
    url: string;
    kind: MediaKind;
    fileName?: string | null;
    fileSize?: number | null;
    cloudflareImageId?: string | null;
    videoCategory?: string | null;
    title?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
  }): Promise<Media> {
    return apiClient.post<Media>('/api/mobile/establishment/media', data);
  },

  deleteMedia(mediaId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/api/mobile/establishment/media/${mediaId}`);
  },

  // Upload file (uses /api/upload which is shared with web - local fallback)
  uploadFile(file: { uri: string; name: string; type: string }): Promise<UploadResponse> {
    return apiClient.uploadFile<UploadResponse>('/api/upload', file);
  },

  // --- Cloudflare Images (direct upload flow) ---

  // Step 1: Get a direct upload URL from Cloudflare Images
  getCloudflareImageUploadUrl(): Promise<CloudflareImageDirectUpload> {
    return apiClient.post<CloudflareImageDirectUpload>('/api/cloudflare/images/direct-upload');
  },

  // Step 2: Upload file directly to Cloudflare (no auth needed, uses uploadURL)
  async uploadToCloudflare(uploadURL: string, file: { uri: string; name: string; type: string }): Promise<Response> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    return fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });
  },

  // Step 3: Attach uploaded image to activity in DB
  attachCloudflareImage(data: {
    activityId: string;
    id: string;
    fileName?: string;
    fileSize?: number;
  }): Promise<{ media: Media }> {
    return apiClient.post<{ media: Media }>('/api/cloudflare/images/attach', data);
  },

  // --- Cloudflare Stream (video direct upload flow) ---

  // Step 1: Get a direct upload URL from Cloudflare Stream
  getCloudflareStreamUploadUrl(): Promise<CloudflareStreamDirectUpload> {
    return apiClient.post<CloudflareStreamDirectUpload>('/api/cloudflare/stream/direct-upload');
  },

  // Step 3: Attach uploaded video to activity in DB (with retry for processing)
  attachCloudflareStream(data: {
    activityId: string;
    uid: string;
    fileName?: string;
    fileSize?: number;
    title?: string;
    videoCategory?: string;
  }): Promise<{ media: Media }> {
    return apiClient.post<{ media: Media }>('/api/cloudflare/stream/attach', data);
  },

  // --- Cover media ---
  setCoverMedia(activityId: string, mediaId: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(`/api/mobile/establishment/activity/cover`, {
      activityId,
      mediaId,
    });
  },

  // --- Events ---
  getEvents(activityId: string): Promise<Event[]> {
    return apiClient.get<Event[]>(`/api/mobile/establishment/activity/events?activityId=${activityId}`);
  },

  createEvent(activityId: string, data: {
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    allDay: boolean;
  }): Promise<{ event: Event }> {
    return apiClient.post<{ event: Event }>(`/api/mobile/establishment/activity/events`, {
      activityId,
      ...data,
    });
  },

  updateEvent(eventId: string, data: {
    title?: string;
    description?: string | null;
    startAt?: string;
    endAt?: string;
    allDay?: boolean;
  }): Promise<{ event: Event }> {
    return apiClient.patch<{ event: Event }>(`/api/mobile/establishment/activity/events/${eventId}`, data);
  },

  deleteEvent(eventId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/api/mobile/establishment/activity/events/${eventId}`);
  },
};

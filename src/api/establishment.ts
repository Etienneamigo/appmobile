import { apiClient } from './client';
import {
  Establishment,
  MyActivity,
  Media,
  UploadResponse,
  MediaKind,
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

  // Media - returns Media[] directly (normalized to empty array if undefined)
  async getMedias(): Promise<Media[]> {
    const response = await apiClient.get<Media[] | { medias?: Media[] } | null>(
      '/api/mobile/establishment/media'
    );
    // Normalize response: handle array, object with medias, or null/undefined
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.medias)) {
      return response.medias;
    }
    return [];
  },

  addMedia(data: {
    url: string;
    kind: MediaKind;
    fileName?: string | null;
    fileSize?: number | null;
  }): Promise<Media> {
    return apiClient.post<Media>('/api/mobile/establishment/media', data);
  },

  deleteMedia(mediaId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/api/mobile/establishment/media/${mediaId}`);
  },

  // Upload file (uses /api/upload which is shared with web)
  uploadFile(file: { uri: string; name: string; type: string }): Promise<UploadResponse> {
    return apiClient.uploadFile<UploadResponse>('/api/upload', file);
  },
};
